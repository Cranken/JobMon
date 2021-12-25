package main

import (
	"fmt"
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
}

type UserInfo struct {
	role     string
	username string
}

type UserClaims struct {
	UserInfo
	jwt.StandardClaims
}

type AuthManager struct {
	hmacSampleSecret []byte
}

const EXPIRATIONTIME = 60 * 60 * 24 * 7
const ISSUER = "monitoring-backend"

func Protected(h httprouter.Handle, authLevel string) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		// TODO: Implement frontend auth and remove this early return
		h(w, r, ps)
		return

		token, err := r.Cookie("Authorization")
		if err != nil {
			allowCors(w.Header())
			w.WriteHeader(401)
			return
		}

		parts := strings.Split(token.Value, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			allowCors(w.Header())
			w.WriteHeader(401)
			return
		}

		user, err := authManager.validate(parts[1])
		if err != nil {
			allowCors(w.Header())
			w.WriteHeader(401)
			return
		}

		if user.role == authLevel {
			h(w, r, ps)
		} else {
			allowCors(w.Header())
			w.WriteHeader(401)
			return
		}
	}
}

func (auth *AuthManager) Init(c Configuration) {
	auth.hmacSampleSecret = []byte(c.JWTSecret)
}

func (auth *AuthManager) validate(tokenStr string) (user UserInfo, err error) {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		return auth.hmacSampleSecret, nil
	})

	if claims, ok := token.Claims.(UserClaims); ok && token.Valid {
		if claims.VerifyExpiresAt(jwt.TimeFunc().Unix(), true) && claims.VerifyIssuer(ISSUER, true) {
			return UserInfo{role: claims.role, username: claims.username}, nil
		}
	}
	return user, err
}

func (auth *AuthManager) generateJWT(user UserInfo) (string, error) {
	claims := UserClaims{
		user,
		jwt.StandardClaims{
			ExpiresAt: jwt.TimeFunc().Unix() + EXPIRATIONTIME,
			Issuer:    ISSUER,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(auth.hmacSampleSecret)
}

func (auth *AuthManager) AppendJWT(user UserInfo, w http.ResponseWriter) (err error) {
	token, err := auth.generateJWT(user)
	if err != nil {
		return
	}

	http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "Bearer " + token, HttpOnly: true, Expires: time.Now().Add(EXPIRATIONTIME * time.Second), Path: "/"})
	return
}

func (auth *AuthManager) AuthUser(username string, password string) (user UserInfo, err error) {
	if username == "admin" && password == "admin" {
		user = UserInfo{role: ADMIN, username: username}
		return
	}
	err = fmt.Errorf("no valid user or invalid password")
	return
}
