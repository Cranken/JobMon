package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"jobmon/config"
	"jobmon/store"
	"jobmon/utils"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/julienschmidt/httprouter"
	"golang.org/x/oauth2"
)

// The user can have one of the following roles.
const (
	JOBCONTROL = "job-control"
	USER       = "user"
	ADMIN      = "admin"
)

// AuthPayLoad stores credentials of local users.
type AuthPayload struct {
	Username string
	Password string
	Remember bool
}

// UserInfo stores the roles and the username of a user.
type UserInfo struct {
	Roles    []string
	Username string
}

// UserClaims stores UserInfo and jwt standard claims which include ExpiresAt and Issuer.
type UserClaims struct {
	UserInfo
	jwt.StandardClaims
}

// OAuthUserInfo stores OAuthentication data for a given user.
type OAuthUserInfo struct {
	Name     string
	Sub      string
	Username string `json:"preferred_username"`
	Eppn     string
	Email    string
}

// UserSession stores session data for a user authenticated with OAuth.
type UserSession struct {
	OAuthUserInfo
	Timestamp time.Time
	IsValid   bool
}

// AuthManager is the main object that stores all the necessary information for
// localUsers, OAuthUsers, sessions etc.
type AuthManager struct {
	hmacSampleSecret []byte // JWT secret
	store            *store.Store
	localUsers       map[string]config.LocalUser
	oauthAvailable   bool
	oauthConfig      oauth2.Config
	oauthUserInfoURL string
	sessions         map[string]UserSession
	sessionsLock     sync.Mutex
}

// default session time
const EXPIRATIONTIME = 60 * 60 * 24 * 7

// default JWT issuer
const ISSUER = "monitoring-backend"

// function type representing handlers
type APIHandle func(http.ResponseWriter, *http.Request, httprouter.Params, UserInfo)

// Protected is a high level function that creates a protected route which
// requires authLevel authentication level.
func (authManager *AuthManager) Protected(h APIHandle, authLevel string) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		// Check if r contains an authorization Cookie, get the full JWT token.
		token, err := r.Cookie("Authorization")
		if err != nil {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusUnauthorized)
			log.Println("auth: No authorization cookie provided")
			return
		}
		// Check if the returned token contains a Bearer schema.
		parts := strings.Split(token.Value, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusUnauthorized)
			log.Println("auth: not a valid bearer token")
			return
		}

		// Get the user from the authorization header.
		user, err := authManager.validate(parts[1])
		if err != nil {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusUnauthorized)
			log.Println("auth: not a valid user")
			return
		}

		// Check if the user has defined roles, if not give him a default USER role.
		userRoles, ok := (*authManager.store).GetUserRoles(user.Username)
		if !ok {
			if !utils.Contains(userRoles.Roles, USER) {
				user.Roles = append(userRoles.Roles, USER)
			}
			(*authManager.store).SetUserRoles(user.Username, userRoles.Roles)
			ok = true
		}

		// Finally check if the user has the right authentication level.
		if ok && (utils.Contains(userRoles.Roles, authLevel) || utils.Contains(user.Roles, ADMIN)) {
			h(w, r, ps, user)
		} else {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusForbidden)
			log.Println("auth: user not permitted")
			return
		}
	}
}

// Init initializes auth with c and store.
func (auth *AuthManager) Init(c config.Configuration, store *store.Store) {
	if c.JWTSecret == "" {
		log.Fatalf("auth: No jwt secret set")
	}
	auth.hmacSampleSecret = []byte(c.JWTSecret)
	if store == nil {
		log.Fatalf("auth: No store given")
	}
	auth.store = store
	auth.localUsers = c.LocalUsers
	err := auth.createOAuthConfig(c)
	if err != nil {
		log.Printf("auth: OAuth is not available: %v", err)
	}
	auth.sessions = make(map[string]UserSession)
}

// createOAuthConfig sets the oauthConfig field for auth based on the configuration c.
func (auth *AuthManager) createOAuthConfig(c config.Configuration) error {
	auth.oauthAvailable = false
	if c.OAuth.ClientID == "" {
		return fmt.Errorf("no OAuth ClientID set")
	}
	if c.OAuth.Secret == "" {
		return fmt.Errorf("no OAuth Secret set")
	}
	if c.OAuth.RedirectURL == "" {
		return fmt.Errorf("no OAuth RedirectURL set")
	}
	if c.OAuth.AuthURL == "" {
		return fmt.Errorf("no OAuth AuthURL set")
	}
	if c.OAuth.TokenURL == "" {
		return fmt.Errorf("no OAuth TokenURL set")
	}
	if c.OAuth.UserInfoURL == "" {
		return fmt.Errorf("no OAuth UserInfoURL set")
	}
	auth.oauthConfig = oauth2.Config{
		ClientID:     c.OAuth.ClientID,
		ClientSecret: c.OAuth.Secret,
		Scopes:       []string{"openid", "email", "profile"},
		RedirectURL:  c.OAuth.RedirectURL,
		Endpoint: oauth2.Endpoint{
			AuthURL:  c.OAuth.AuthURL,
			TokenURL: c.OAuth.TokenURL,
		},
	}
	auth.oauthUserInfoURL = c.OAuth.UserInfoURL
	auth.oauthAvailable = true
	return nil
}

// validate checks if tokenStr is validated from auth, if that's the case
// it returns the user information.
func (auth *AuthManager) validate(tokenStr string) (user UserInfo, err error) {
	token, err := jwt.ParseWithClaims(tokenStr, &UserClaims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		return auth.hmacSampleSecret, nil
	})
	if err != nil {
		return
	}
	claims, ok := token.Claims.(*UserClaims)
	if ok && token.Valid {
		if claims.VerifyExpiresAt(jwt.TimeFunc().Unix(), true) && claims.VerifyIssuer(ISSUER, true) {
			if storeToken, ok := (*auth.store).GetUserSessionToken(claims.Username); ok && storeToken == tokenStr {
				return claims.UserInfo, nil
			} else {
				err = fmt.Errorf("session was revoked")
			}
		} else {
			err = fmt.Errorf("token expired or issuer does not match")
		}
	} else {
		err = fmt.Errorf("invalid token")
	}
	return
}

// GenerateJWT, generates a JSON Web Token for the given user.
// remember specifies if JWT should be valid for a year.
func (auth *AuthManager) GenerateJWT(user UserInfo, remember bool) (string, error) {
	expirationTime := EXPIRATIONTIME * time.Second
	if remember {
		expirationTime = time.Hour * 24 * 365
	}
	if utils.Contains(user.Roles, JOBCONTROL) {
		expirationTime *= 10 // Slurm API should "never" expire
	}
	claims := UserClaims{
		user,
		jwt.StandardClaims{
			ExpiresAt: time.Now().Add(expirationTime).Unix(),
			Issuer:    ISSUER,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ret, err := token.SignedString(auth.hmacSampleSecret)
	if err == nil {
		(*auth.store).SetUserSessionToken(user.Username, ret)
	}
	return ret, err
}

// AppendJWT appends a JWT cookie to the http response for user UserInfo to the writer w.
func (auth *AuthManager) AppendJWT(user UserInfo, remember bool, w http.ResponseWriter) (err error) {
	token, err := auth.GenerateJWT(user, remember)
	if err != nil {
		return
	}

	expirationTime := EXPIRATIONTIME * time.Second
	if remember {
		expirationTime = time.Hour * 24 * 365
	}
	http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "Bearer " + token, Expires: time.Now().Add(expirationTime), Path: "/"})
	return
}

// AuthLocalUser returns a user if username and password are valid credentials.
func (auth *AuthManager) AuthLocalUser(username string, password string) (user UserInfo, err error) {
	if val, ok := auth.localUsers[username]; ok && password == val.Password {
		user = UserInfo{Roles: []string{val.Role}, Username: username}
		return
	}
	err = fmt.Errorf("no valid user or invalid password")
	return
}

// Logout closes the session for the given user.
func (auth *AuthManager) Logout(username string) {
	(*auth.store).RemoveUserSessionToken(username)
}

// OAuthAvailable checks if OAuth is possible.
func (auth *AuthManager) OAuthAvailable() bool {
	return auth.oauthAvailable
}

// GetOAuthCodeURL returns the URL that redirects the user to the FeLS login page.
func (auth *AuthManager) GetOAuthCodeURL(sessionID string) string {
	return auth.oauthConfig.AuthCodeURL(sessionID, oauth2.AccessTypeOnline)
}

// GenerateSession creates a session, returns the session ID.
func (auth *AuthManager) GenerateSession() (string, error) {
	auth.sessionsLock.Lock()
	defer auth.sessionsLock.Unlock()
	var sessionID string
	for {
		randData := make([]byte, 32)
		if _, err := rand.Read(randData); err != nil {
			return "", fmt.Errorf("no random data for session id could be generated")
		}
		sessionID = hex.EncodeToString(randData)

		if _, sessionExists := auth.sessions[sessionID]; !sessionExists {
			break
		}
	}
	auth.sessions[sessionID] = UserSession{IsValid: true, Timestamp: time.Now()}
	return sessionID, nil
}

// GetSession returns the created session.
func (auth *AuthManager) GetSession(sessionID string) (UserSession, bool) {
	auth.sessionsLock.Lock()
	defer auth.sessionsLock.Unlock()
	session, ok := auth.sessions[sessionID]
	return session, ok
}

// SetSessionUserInfo updates the session with id sessionID for the OAuthUser info.
func (auth *AuthManager) SetSessionUserInfo(sessionID string, info OAuthUserInfo) {
	auth.sessionsLock.Lock()
	defer auth.sessionsLock.Unlock()
	session, ok := auth.sessions[sessionID]
	if ok {
		session.Email = info.Email
		session.Username = info.Username
		session.Name = info.Name
		session.Eppn = info.Eppn
		session.Sub = info.Sub
		auth.sessions[sessionID] = session
	}
}

// ExchangeOAuthToken returns authentication token in the case of OAuth authentication.
func (auth *AuthManager) ExchangeOAuthToken(code string) (*oauth2.Token, error) {
	return auth.oauthConfig.Exchange(context.Background(), code)
}

// GetOAuthUserInfo returns OAuth user info.
func (auth *AuthManager) GetOAuthUserInfo(token *oauth2.Token) (*OAuthUserInfo, error) {
	client := auth.oauthConfig.Client(context.Background(), token)
	resp, err := client.Get(auth.oauthUserInfoURL)
	if err != nil {
		return nil, err
	}
	dat, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	var userInfo OAuthUserInfo
	err = json.Unmarshal(dat, &userInfo)
	return &userInfo, err
}
