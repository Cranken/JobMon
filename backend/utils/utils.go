package utils

import (
	"fmt"
)

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

// SliceMap applies f to all the elements of TSlice.
func SliceMap[T comparable](f func(T) T, TSlice []T) []T {
	TSliceCopy := make([]T, len(TSlice))
	for i, sliceElement := range TSlice {
		TSliceCopy[i] = f(sliceElement)
	}
	return TSliceCopy
}

// applyQuotes encloses s into double quotes.
func ApplyQuotes(s string) string {
	return fmt.Sprintf(`"%v"`, s)
}
