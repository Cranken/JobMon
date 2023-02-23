package utils

import (
	"net/http"
)

// AllowCors is a helper function to allow CORS(Cross-Origin Resource Sharing).
// See: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
func AllowCors(r *http.Request, header http.Header) {
	if m := r.Header.Get("Allow"); m != "" {
		header.Set("Access-Control-Allow-Methods", m)
	}
	if o := r.Header.Get("Origin"); o != "" {
		header.Set("Access-Control-Allow-Origin", o)
	}
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

// Remove returns a container without target.
func Remove[T comparable](container []T, target T) []T {
	for i, v := range container {
		if v == target {
			return append(container[:i], container[i+1:]...)
		}
	}
	return container
}

// Tuple with elements <First> and <Second>
type Tuple[T any, V any] struct {
	First  T
	Second V
}
