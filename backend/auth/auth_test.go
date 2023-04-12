package auth

import (
	"jobmon/config"
	"jobmon/store"
	"jobmon/test"
	"reflect"
	"testing"
	"time"
)

func TestValidToken(t *testing.T) {
	auth := AuthManager{}
	dur, _ := time.ParseDuration("60s")
	config := config.Configuration{
		JSONWebTokenLifeTime: dur,
		APITokenLifeTime:     dur,
		JWTSecret:            "<jwt_secret (secret to use when generating java web tokens)>",
		OAuth: config.OAuthConfig{
			ClientID:              "<oauth_client_id>",
			Secret:                "<oauth_secret>",
			AuthURL:               "<auth_url>",
			TokenURL:              "<token_url>",
			UserInfoURL:           "<user_info_url>",
			RedirectURL:           "http://<backend_url>:<backend_port>/auth/oauth/callback",
			AfterLoginRedirectUrl: "http://<frontend_url>:<frontend_port>/jobs",
		},
		LocalUsers: map[string]config.LocalUser{
			"userTest": {
				BCryptHash: "$2a$12$uVKPshHBvvIF4m22TleIiOiPAlO4icb/BlirjNWPv3UKooKOPQXtW",
				Role:       "user",
			},
		},
	}
	var store store.Store = &test.MockStore{}
	auth.Init(config, &store)
	val := auth.localUsers["userTest"]
	user :=
		UserInfo{
			Roles:    []string{val.Role},
			Username: "userTest",
		}

	token, _ := auth.GenerateJWT(user)
	UI, err := auth.validate(token)
	if err != nil {
		t.Fatalf("Token not accepted")
	}
	if UI.Username != user.Username || !reflect.DeepEqual(UI.Roles, user.Roles) {
		t.Fatalf("Wrong user returned")
	}
}
