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
	Role     string
	Username string
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
		token, err := r.Cookie("Authorization")
		if err != nil {
			allowCors(r, w.Header())
			w.WriteHeader(401)
			return
		}

		parts := strings.Split(token.Value, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			allowCors(r, w.Header())
			w.WriteHeader(401)
			return
		}

		user, err := authManager.validate(parts[1])
		if err != nil {
			allowCors(r, w.Header())
			w.WriteHeader(401)
			return
		}

		if user.Role == authLevel || user.Role == ADMIN {
			h(w, r, ps)
		} else {
			allowCors(r, w.Header())
			w.WriteHeader(403)
			return
		}
	}
}

func (auth *AuthManager) Init(c Configuration) {
	auth.hmacSampleSecret = []byte(c.JWTSecret)
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
			return claims.UserInfo, nil
		} else {
			err = fmt.Errorf("token expired or issuer does not match")
		}
	} else {
		err = fmt.Errorf("invalid token")
	}
	return
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

	http.SetCookie(w, &http.Cookie{Name: "Authorization", Value: "Bearer " + token, Expires: time.Now().Add(EXPIRATIONTIME * time.Second), Path: "/"})
	return
}

func (auth *AuthManager) AuthUser(username string, password string) (user UserInfo, err error) {
	if username == "admin" && password == "admin" {
		user = UserInfo{Role: ADMIN, Username: username}
		return
	}
	err = fmt.Errorf("no valid user or invalid password")
	return
}
