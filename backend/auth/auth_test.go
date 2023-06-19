package auth

import (
	"fmt"
	"jobmon/config"
	"jobmon/notify"
	"jobmon/store"
	"jobmon/test"
	"reflect"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

// Configurations and values used in multiple tests

var OauthTestConfig = config.OAuthConfig{
	ClientID:              "<oauth_client_id>",
	Secret:                "<oauth_secret>",
	AuthURL:               "<auth_url>",
	TokenURL:              "<token_url>",
	UserInfoURL:           "<user_info_url>",
	RedirectURL:           "http://<backend_url>:<backend_port>/auth/oauth/callback",
	AfterLoginRedirectUrl: "http://<frontend_url>:<frontend_port>/jobs",
}

var LocalUsersTestConfig = map[string]config.LocalUser{
	"userTest": {
		BCryptHash: "$2a$12$uVKPshHBvvIF4m22TleIiOiPAlO4icb/BlirjNWPv3UKooKOPQXtW",
		Role:       "user",
	},

	"apiTest": {
		BCryptHash: "$2a$12$uVKPshHBvvIF4m22TleIiOiPAlO4icb/BlirjNWPv3UKooKOPQXtW",
		Role:       "job-control",
	},

	"adminTest": {
		BCryptHash: "$2a$12$uVKPshHBvvIF4m22TleIiOiPAlO4icb/BlirjNWPv3UKooKOPQXtW",
		Role:       "admin",
	},
}

var standartLifetime, _ = time.ParseDuration("120s")

// Tests

// Tests if auth is working with valid tokens
func TestValidToken(t *testing.T) {
	// Setup test environment
	authManager := AuthManager{}
	// Set required global jobmon config options
	config := config.Configuration{
		JSONWebTokenLifeTime: standartLifetime,
		APITokenLifeTime:     standartLifetime,
		JWTSecret:            "<jwt_secret (secret to use when generating java web tokens)>",
		OAuth:                OauthTestConfig,
		LocalUsers:           LocalUsersTestConfig,
	}
	var store store.Store = &test.MockStore{}
	var notify notify.Notifier = &test.MockEmailNotifier{}
	authManager.Init(config, &store, &notify)
	val := authManager.localUsers["userTest"]
	user :=
		UserInfo{
			Roles:    []string{val.Role},
			Username: "userTest",
		}

	// Test with valid user
	token, _ := authManager.GenerateJWT(user)
	UI, err := authManager.validate(token)
	if err != nil {
		t.Fatalf("Token not accepted")
	}
	if UI.Username != user.Username || !reflect.DeepEqual(UI.Roles, user.Roles) {
		t.Fatalf("Wrong user returned")
	}
}

// Tests if auth denies access with expired tokens
func TestExpiredToken(t *testing.T) {
	authManager := AuthManager{}
	configLifetime, _ := time.ParseDuration("0s")
	config := config.Configuration{
		JSONWebTokenLifeTime: configLifetime,
		APITokenLifeTime:     configLifetime,
		JWTSecret:            "<jwt_secret (secret to use when generating java web tokens)>",
		OAuth:                OauthTestConfig,
		LocalUsers:           LocalUsersTestConfig,
	}
	var store store.Store = &test.MockStore{}
	var notify notify.Notifier = &test.MockEmailNotifier{}
	authManager.Init(config, &store, &notify)
	val := authManager.localUsers["userTest"]
	user :=
		UserInfo{
			Roles:    []string{val.Role},
			Username: "userTest",
		}

	// Test with expired token
	token, _ := authManager.GenerateJWT(user)
	_, err := authManager.validate(token)
	if err == nil {
		t.Fatalf("Token was accepted")
	}
}

// Tests if auth denies access with tokens issued in the future
func TestTokenFromFuture(t *testing.T) {
	authManager := AuthManager{}
	config := config.Configuration{
		JSONWebTokenLifeTime: standartLifetime,
		APITokenLifeTime:     standartLifetime,
		JWTSecret:            "<jwt_secret (secret to use when generating java web tokens)>",
		OAuth:                OauthTestConfig,
		LocalUsers:           LocalUsersTestConfig,
	}
	var store store.Store = &test.MockStore{}
	var notify notify.Notifier = &test.MockEmailNotifier{}
	authManager.Init(config, &store, &notify)
	val := authManager.localUsers["userTest"]
	user :=
		UserInfo{
			Roles:    []string{val.Role},
			Username: "userTest",
		}

	now := time.Now()
	issuedDif, _ := time.ParseDuration("60s")
	claims :=
		UserClaims{
			user,
			jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(now.Add(standartLifetime)),
				IssuedAt:  jwt.NewNumericDate(now.Add(issuedDif)),
				Issuer:    ISSUER,
			},
		}

	// Create JSON web token with issued at in the future
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ret, _ := token.SignedString(authManager.hmacSampleSecret)
	_, err := authManager.validate(ret)
	if err == nil {
		t.Fatalf("Token was accepted")
	}
}

// Tests if auth denies access with tokens from other issuers
func TestTokenWrongIssuer(t *testing.T) {
	authManager := AuthManager{}
	config := config.Configuration{
		JSONWebTokenLifeTime: standartLifetime,
		APITokenLifeTime:     standartLifetime,
		JWTSecret:            "<jwt_secret (secret to use when generating java web tokens)>",
		OAuth:                OauthTestConfig,
		LocalUsers:           LocalUsersTestConfig,
	}
	var store store.Store = &test.MockStore{}
	var notify notify.Notifier = &test.MockEmailNotifier{}
	authManager.Init(config, &store, &notify)
	val := authManager.localUsers["userTest"]
	user :=
		UserInfo{
			Roles:    []string{val.Role},
			Username: "userTest",
		}

	now := time.Now()
	claims :=
		UserClaims{
			user,
			jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(now.Add(standartLifetime)),
				IssuedAt:  jwt.NewNumericDate(now),
				Issuer:    "wrong_Issuer",
			},
		}

	// Create JSON web token with wrong issuer
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ret, _ := token.SignedString(authManager.hmacSampleSecret)
	_, err := authManager.validate(ret)
	if err == nil {
		t.Fatalf("Token was accepted")
	}
}

// Tests if auth denies access with tokens from unknown users
func TestTokenUnknownUser(t *testing.T) {
	authManager := AuthManager{}
	config := config.Configuration{
		JSONWebTokenLifeTime: standartLifetime,
		APITokenLifeTime:     standartLifetime,
		JWTSecret:            "<jwt_secret (secret to use when generating java web tokens)>",
		OAuth:                OauthTestConfig,
		LocalUsers:           LocalUsersTestConfig,
	}
	var store store.Store = &test.MockStore{}
	var notify notify.Notifier = &test.MockEmailNotifier{}
	authManager.Init(config, &store, &notify)
	val := authManager.localUsers["userTest"]
	user :=
		UserInfo{
			Roles:    []string{val.Role},
			Username: "unknown",
		}

	now := time.Now()
	claims :=
		UserClaims{
			user,
			jwt.RegisteredClaims{
				ExpiresAt: jwt.NewNumericDate(now.Add(standartLifetime)),
				IssuedAt:  jwt.NewNumericDate(now),
				Issuer:    ISSUER,
			},
		}

	// Create JSON web token with unknown user
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	ret, _ := token.SignedString(authManager.hmacSampleSecret)
	_, err := authManager.validate(ret)
	if err == nil {
		t.Fatalf("Token was accepted")
	}
}

// Tests if tokens get revoked on logout
func TestLogoutTokenDelete(t *testing.T) {
	authManager := AuthManager{}
	config := config.Configuration{
		JSONWebTokenLifeTime: standartLifetime,
		APITokenLifeTime:     standartLifetime,
		JWTSecret:            "<jwt_secret (secret to use when generating java web tokens)>",
		OAuth:                OauthTestConfig,
		LocalUsers:           LocalUsersTestConfig,
	}
	var store store.Store = &test.MockStore{}
	var notify notify.Notifier = &test.MockEmailNotifier{}
	authManager.Init(config, &store, &notify)
	val := authManager.localUsers["userTest"]
	user :=
		UserInfo{
			Roles:    []string{val.Role},
			Username: "userTest",
		}

	token, _ := authManager.GenerateJWT(user)

	// Test with valid user before logout
	UI, err := authManager.validate(token)
	if err != nil {
		t.Fatalf("Token not accepted before logout")
	}
	if UI.Username != user.Username || !reflect.DeepEqual(UI.Roles, user.Roles) {
		t.Fatalf("Wrong user returned before logout")
	}

	// Test with valid user after logout
	authManager.Logout("userTest")
	_, err = authManager.validate(token)
	if err == nil {
		t.Fatalf("Token accepted after logout")
	}
}

// Test if the administrators get notified when a new JWT for a user with the role jobcontrol is created
func TestNotifyJobControlUser(t *testing.T) {
	authManager := AuthManager{}
	config := config.Configuration{
		JSONWebTokenLifeTime: standartLifetime,
		APITokenLifeTime:     standartLifetime,
		JWTSecret:            "<jwt_secret (secret to use when generating java web tokens)>",
		OAuth:                OauthTestConfig,
		LocalUsers:           LocalUsersTestConfig,
	}
	var store store.Store = &test.MockStore{}
	var e_notifier test.MockEmailNotifier
	var notifier notify.Notifier = &e_notifier
	authManager.Init(config, &store, &notifier)
	val := authManager.localUsers["apiTest"]
	user :=
		UserInfo{
			Roles:    []string{val.Role},
			Username: "apiTest",
		}

	e_notifier.ClearMessages()
	if len(e_notifier.GetMessages()) != 0 {
		t.Fatalf("Initializing failed")
	}

	_, _ = authManager.GenerateJWT(user)

	fmt.Println(e_notifier.GetMessages())

	if len(e_notifier.GetMessages()) == 0 {
		t.Fatalf("No message to administrators")
	}
}

// Test if the administrators do not get notified for newly created JWT by normal users
func TestNoNotifyNormalUser(t *testing.T) {
	authManager := AuthManager{}
	config := config.Configuration{
		JSONWebTokenLifeTime: standartLifetime,
		APITokenLifeTime:     standartLifetime,
		JWTSecret:            "<jwt_secret (secret to use when generating java web tokens)>",
		OAuth:                OauthTestConfig,
		LocalUsers:           LocalUsersTestConfig,
	}
	var store store.Store = &test.MockStore{}
	var e_notifier test.MockEmailNotifier
	var notifier notify.Notifier = &e_notifier
	authManager.Init(config, &store, &notifier)
	val := authManager.localUsers["userTest"]
	user :=
		UserInfo{
			Roles:    []string{val.Role},
			Username: "userTest",
		}

	e_notifier.ClearMessages()
	if len(e_notifier.GetMessages()) != 0 {
		t.Fatalf("Initializing failed")
	}

	_, _ = authManager.GenerateJWT(user)

	fmt.Println(e_notifier.GetMessages())

	if len(e_notifier.GetMessages()) != 0 {
		t.Fatalf("Message to administrators send")
	}
}

// Test if the administrators do not get notified for newly created JWT by normal users
func TestNoNotifyAdminUser(t *testing.T) {
	authManager := AuthManager{}
	config := config.Configuration{
		JSONWebTokenLifeTime: standartLifetime,
		APITokenLifeTime:     standartLifetime,
		JWTSecret:            "<jwt_secret (secret to use when generating java web tokens)>",
		OAuth:                OauthTestConfig,
		LocalUsers:           LocalUsersTestConfig,
	}
	var store store.Store = &test.MockStore{}
	var e_notifier test.MockEmailNotifier
	var notifier notify.Notifier = &e_notifier
	authManager.Init(config, &store, &notifier)
	val := authManager.localUsers["adminTest"]
	user :=
		UserInfo{
			Roles:    []string{val.Role},
			Username: "adminTest",
		}

	e_notifier.ClearMessages()
	if len(e_notifier.GetMessages()) != 0 {
		t.Fatalf("Initializing failed")
	}

	_, _ = authManager.GenerateJWT(user)

	fmt.Println(e_notifier.GetMessages())

	if len(e_notifier.GetMessages()) != 0 {
		t.Fatalf("Message to administrators send")
	}
}
