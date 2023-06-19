package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"jobmon/config"
	"jobmon/logging"
	"jobmon/notify"
	"jobmon/store"
	"jobmon/utils"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v4"
	// HttpRouter is a lightweight high performance HTTP request router (also called multiplexer or just mux for short) for Go
	"github.com/julienschmidt/httprouter"
	// Package bcrypt implements Provos and Mazières's bcrypt adaptive hashing algorithm. See http://www.usenix.org/event/usenix99/provos/provos.pdf
	"golang.org/x/crypto/bcrypt"
	// oauth2 package contains a client implementation for OAuth 2.0 spec
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
	Username     string
	Password     string
	FrontendOnly bool
}

// UserInfo stores the roles and the username of a user.
type UserInfo struct {
	Roles    []string `json:"Roles"`
	Username string   `json:"Username"`
}

// UserClaims stores UserInfo and
// jwt registered claims which include ExpiresAt, IssuedAt and Issuer
// (See: https://datatracker.ietf.org/doc/html/rfc7519#section-4.1)
type UserClaims struct {
	UserInfo
	jwt.RegisteredClaims
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
	hmacSampleSecret     []byte // JWT secret
	JSONWebTokenLifeTime time.Duration
	APITokenLifeTime     time.Duration
	store                *store.Store
	localUsers           map[string]config.LocalUser
	oauthAvailable       bool
	oauthConfig          oauth2.Config
	oauthUserInfoURL     string
	sessions             map[string]UserSession
	sessionsLock         sync.Mutex
	notifier             *notify.Notifier
}

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
			http.SetCookie(
				w,
				&http.Cookie{
					Name:    "Authorization",
					Value:   "",
					Expires: time.Unix(0, 0),
					Path:    "/",
				},
			)
			w.WriteHeader(http.StatusUnauthorized)
			logging.Error("AuthManager: Protected(): No authorization cookie provided")
			return
		}
		// Check if the returned token contains a Bearer schema.
		parts := strings.Split(token.Value, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.SetCookie(
				w,
				&http.Cookie{
					Name:    "Authorization",
					Value:   "",
					Expires: time.Unix(0, 0),
					Path:    "/",
				},
			)
			w.WriteHeader(http.StatusUnauthorized)
			logging.Error("AuthManager: Protected(): not a valid bearer token")
			return
		}

		// Get the user from the authorization header.
		user, err := authManager.validate(parts[1])
		if err != nil {
			http.SetCookie(
				w,
				&http.Cookie{
					Name:    "Authorization",
					Value:   "",
					Expires: time.Unix(0, 0),
					Path:    "/",
				},
			)
			w.WriteHeader(http.StatusUnauthorized)
			logging.Error("AuthManager: Protected(): failed validate: ", err)
			return
		}

		/*
		* user.Roles contains the roles send in the authorization header.
		* Users are allowed if this list contains the needed auth-level or the role "admin"
		 */
		if utils.Contains(user.Roles, ADMIN) ||
			utils.Contains(user.Roles, authLevel) {
			h(w, r, ps, user)
		} else {
			http.SetCookie(
				w,
				&http.Cookie{
					Name:    "Authorization",
					Value:   "",
					Expires: time.Unix(0, 0),
					Path:    "/",
				},
			)
			w.WriteHeader(http.StatusForbidden)
			logging.Error("AuthManager: Protected(): user not permitted")
			return
		}
	}
}

// Init initializes auth with c and store.
func (auth *AuthManager) Init(c config.Configuration, store *store.Store, notifier *notify.Notifier) {

	auth.JSONWebTokenLifeTime = c.JSONWebTokenLifeTime
	auth.APITokenLifeTime = c.APITokenLifeTime

	if c.JWTSecret == "" {
		logging.Fatal("auth: Init(): No jwt secret set")
	}
	auth.hmacSampleSecret = []byte(c.JWTSecret)

	if store == nil {
		logging.Fatal("auth: Init(): No store given")
	}
	auth.store = store
	auth.localUsers = c.LocalUsers
	auth.notifier = notifier

	err := auth.createOAuthConfig(c)
	if err != nil {
		logging.Error("auth: Protected(): OAuth is not available: ", err)
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

	auth.oauthConfig =
		oauth2.Config{
			ClientID:     c.OAuth.ClientID,
			ClientSecret: c.OAuth.Secret,
			Scopes: []string{
				"openid",
				"email",
				"profile",
			},
			RedirectURL: c.OAuth.RedirectURL,
			Endpoint: oauth2.Endpoint{
				AuthURL:  c.OAuth.AuthURL,
				TokenURL: c.OAuth.TokenURL,
			},
		}
	auth.oauthUserInfoURL = c.OAuth.UserInfoURL
	auth.oauthAvailable = true

	logging.Info("auth: createOAuthConfig(): Created OAuth config")
	return nil
}

// validate checks if tokenStr is validated from auth, if that's the case
// it returns the user information.
func (auth *AuthManager) validate(tokenStr string) (UserInfo, error) {

	// Parse, validate and verify token
	// This per default also checks if time based claims ExpiresAt, IssuedAt, NotBefore are valid
	token, err :=
		jwt.NewParser(
			jwt.WithValidMethods(
				[]string{jwt.SigningMethodHS256.Alg()},
			),
		).ParseWithClaims(
			tokenStr,
			&UserClaims{},
			// Return key / secret for validating
			func(token *jwt.Token) (interface{}, error) {
				return auth.hmacSampleSecret, nil
			},
		)
	if err != nil {
		return UserInfo{}, err
	}

	// Check issuer
	claims := token.Claims.(*UserClaims)
	if !claims.VerifyIssuer(ISSUER, true) {
		return UserInfo{}, fmt.Errorf("issuer does not match")
	}

	// Get token from store
	tokenFromStore, ok := (*auth.store).GetUserSessionToken(claims.Username)
	if !ok || tokenFromStore != tokenStr {
		return UserInfo{}, fmt.Errorf("session was revoked")
	}

	logging.Info("auth: validate(): Validated token for ", claims.UserInfo.Username)
	return claims.UserInfo, nil
}

// GenerateJWT, generates a JSON Web Token for the given user.
func (auth *AuthManager) GenerateJWT(user UserInfo) (string, error) {

	// Set JSON web token life time
	lifeTime := auth.JSONWebTokenLifeTime
	if utils.Contains(user.Roles, JOBCONTROL) {
		(*auth.notifier).Notify("JWT for job-control user changed", "The JWT for user '"+user.Username+"' got newly generated.")
		lifeTime = auth.APITokenLifeTime
	}

	// Set JSON web token claims
	now := time.Now()
	claims :=
		UserClaims{
			user,
			jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(now.Add(lifeTime)),
				IssuedAt:  jwt.NewNumericDate(now),
				Issuer:    ISSUER,
			},
		}

	// Create JSON web token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ret, err := token.SignedString(auth.hmacSampleSecret)

	// Store JSON web token in database
	if err == nil {
		(*auth.store).SetUserSessionToken(user.Username, ret)
	}

	return ret, err
}

// AppendJWT appends a JWT cookie to the http response for user UserInfo to the writer w.
func (auth *AuthManager) AppendJWT(user UserInfo, w http.ResponseWriter) (err error) {
	token, err := auth.GenerateJWT(user)
	if err != nil {
		return
	}

	lifeTime := auth.JSONWebTokenLifeTime

	http.SetCookie(
		w,
		&http.Cookie{
			Name:    "Authorization",
			Value:   "Bearer " + token,
			Expires: time.Now().Add(lifeTime),
			Path:    "/",
		},
	)
	return
}

// AuthLocalUser returns a user if username and password are valid credentials.
func (auth *AuthManager) AuthLocalUser(
	username string,
	password string,
) (
	user UserInfo,
	err error,
) {
	// Check if username is valid
	val, ok := auth.localUsers[username]
	if !ok {
		err = fmt.Errorf("auth: AuthLocalUser(): invalid user '%s'", username)
		return
	}

	// Check if password is valid
	if bcrypt_err := bcrypt.CompareHashAndPassword([]byte(val.BCryptHash), []byte(password)); bcrypt_err != nil {
		err = fmt.Errorf("auth: AuthLocalUser(): %w", bcrypt_err)
		return
	}

	// Return user information
	user =
		UserInfo{
			Roles:    []string{val.Role},
			Username: username,
		}
	logging.Info("auth: AuthLocalUser(): Authenticated local user '", username, "' with role '", val.Role, "'")
	return
}

// Logout logs out user <username> from active sessions
func (auth *AuthManager) Logout(username string) {
	(*auth.store).RemoveUserSession(username)
}

// OAuthAvailable checks if OAuth is available.
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

	dat, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var userInfo OAuthUserInfo
	err = json.Unmarshal(dat, &userInfo)
	return &userInfo, err
}
