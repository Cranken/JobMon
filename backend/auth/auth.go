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

const (
	JOBCONTROL = "job-control"
	USER       = "user"
	ADMIN      = "admin"
)

type AuthPayload struct {
	Username string
	Password string
	Remember bool
}

type UserInfo struct {
	Roles    []string
	Username string
}

type UserClaims struct {
	UserInfo
	jwt.StandardClaims
}

type OAuthUserInfo struct {
	Name     string
	Sub      string
	Username string `json:"preferred_username"`
	Eppn     string
	Email    string
}

type UserSession struct {
	OAuthUserInfo
	Timestamp time.Time
	IsValid   bool
}

type AuthManager struct {
	hmacSampleSecret []byte
	store            *store.Store
	localUsers       map[string]config.LocalUser
	oauthAvailable   bool
	oauthConfig      oauth2.Config
	oauthUserInfoURL string
	sessions         map[string]UserSession
	sessionsLock     sync.Mutex
}

const EXPIRATIONTIME = 60 * 60 * 24 * 7
const ISSUER = "monitoring-backend"

type APIHandle func(http.ResponseWriter, *http.Request, httprouter.Params, UserInfo)

// Create protected route which requires given authentication level
func (authManager *AuthManager) Protected(h APIHandle, authLevel string) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		token, err := r.Cookie("Authorization")
		if err != nil {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusUnauthorized)
			log.Println("auth: No authorization cookie provided")
			return
		}

		parts := strings.Split(token.Value, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusUnauthorized)
			log.Println("auth: not a valid bearer token")
			return
		}

		user, err := authManager.validate(parts[1])
		if err != nil {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusUnauthorized)
			log.Println("auth: not a valid user")
			return
		}

		roles, ok := (*authManager.store).GetUserRoles(user.Username)
		if !ok {
			if !utils.Contains(roles, USER) {
				roles = append(roles, USER)
			}
			(*authManager.store).SetUserRoles(user.Username, roles)
			ok = true
		}

		if ok && (utils.Contains(roles, authLevel) || utils.Contains(roles, ADMIN)) {
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

// Generate a JWT for the given user. Parameter 'remember' specifies if the JWT should be valid for a year
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

// Append JWT cookie to the http response
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

// Check if given username and password are correct
func (auth *AuthManager) AuthLocalUser(username string, password string) (user UserInfo, err error) {
	if val, ok := auth.localUsers[username]; ok && password == val.Password {
		user = UserInfo{Roles: []string{val.Role}, Username: username}
		return
	}
	err = fmt.Errorf("no valid user or invalid password")
	return
}

// Log given user out of active sessions
func (auth *AuthManager) Logout(username string) {
	(*auth.store).RemoveUserSessionToken(username)
}

func (auth *AuthManager) OAuthAvailable() bool {
	return auth.oauthAvailable
}

func (auth *AuthManager) GetOAuthCodeURL(sessionID string) string {
	return auth.oauthConfig.AuthCodeURL(sessionID, oauth2.AccessTypeOnline)
}

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

func (auth *AuthManager) GetSession(sessionID string) (UserSession, bool) {
	auth.sessionsLock.Lock()
	defer auth.sessionsLock.Unlock()
	session, ok := auth.sessions[sessionID]
	return session, ok
}

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

func (auth *AuthManager) ExchangeOAuthToken(code string) (*oauth2.Token, error) {
	return auth.oauthConfig.Exchange(context.Background(), code)
}

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
