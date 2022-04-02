package auth

import (
	"fmt"
	"jobmon/config"
	"jobmon/store"
	"jobmon/utils"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt"
	"github.com/julienschmidt/httprouter"
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
	Role     string
	Username string
}

type UserClaims struct {
	UserInfo
	jwt.StandardClaims
}

type AuthManager struct {
	hmacSampleSecret []byte
	store            *store.Store
	localUsers       map[string]config.LocalUser
}

const EXPIRATIONTIME = 60 * 60 * 24 * 7
const ISSUER = "monitoring-backend"

// Create protected route which requires given authentication level
func (authManager *AuthManager) Protected(h httprouter.Handle, authLevel string) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		token, err := r.Cookie("Authorization")
		if err != nil {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		parts := strings.Split(token.Value, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		user, err := authManager.validate(parts[1])
		if err != nil {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusUnauthorized)
			return
		}

		if user.Role == authLevel || user.Role == ADMIN {
			h(w, r, ps)
		} else {
			utils.AllowCors(r, w.Header())
			http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "", Expires: time.Unix(0, 0), Path: "/"})
			w.WriteHeader(http.StatusForbidden)
			return
		}
	}
}

func (auth *AuthManager) Init(c config.Configuration, store *store.Store) {
	auth.hmacSampleSecret = []byte(c.JWTSecret)
	auth.store = store
	auth.localUsers = c.LocalUsers
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
	if user.Role == JOBCONTROL {
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
func (auth *AuthManager) AuthUser(username string, password string) (user UserInfo, err error) {
	if val, ok := auth.localUsers[username]; ok && password == val.Password {
		user = UserInfo{Role: val.Role, Username: username}
		return
	}
	err = fmt.Errorf("no valid user or invalid password")
	return
}

// Log given user out of active sessions
func (auth *AuthManager) Logout(username string) {
	(*auth.store).RemoveUserSessionToken(username)
}
