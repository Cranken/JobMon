package utils

import (
	"net/http"
)

// AllowCors is helper function to allow CORS.
func AllowCors(r *http.Request, header http.Header) {
	header.Set("Access-Control-Allow-Methods", r.Header.Get("Allow"))
	header.Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
	header.Set("Access-Control-Allow-Credentials", "true")
	header.Set("Access-Control-Expose-Headers", "Set-Cookie")
}

// Contains checks if slice contains val.
func Contains[T comparable](slice []T, val T) bool {
	for _, elem := range slice {
		if val == elem {
			return true
		}
	}
	return false
}

// Remove removes target from container if it exists.
func Remove[T comparable](container []T, target T) []T {
	for i, v := range container {
		if v == target {
			return append(container[:i], container[i+1:]...)
		}
	}
	return container
}

// Tuple data structure.
type Tuple[T any, V any] struct {
	First  T
	Second V
}
