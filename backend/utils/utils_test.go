package utils

import (
	"reflect"
	"testing"
)

func TestContains(t *testing.T) {
	slice := []int{1, 2, 3, 4, 5}

	// Test when the value is present in the slice
	if !Contains(slice, 3) {
		t.Errorf("Contains returned false for an existing value")
	}

	// Test when the value is not present in the slice
	if Contains(slice, 6) {
		t.Errorf("Contains returned true for a non-existing value")
	}
	var emptySlice []int
	if Contains(emptySlice, 1) {
		t.Errorf("Contains returned true for non-existing value")
	}

}

func TestRemove(t *testing.T) {
	container := []string{"apple", "banana", "cherry"}

	// Test removing an existing element
	result := Remove(container, "banana")
	expected := []string{"apple", "cherry"}
	if !reflect.DeepEqual(result, expected) {
		t.Errorf("Remove returned incorrect result, got: %v, want: %v", result, expected)
	}

	// Test removing a non-existing element
	result = Remove(container, "grape")
	if !reflect.DeepEqual(result, container) {
		t.Errorf("Remove returned incorrect result, got: %v, want: %v", result, container)
	}
}

func TestSliceMap(t *testing.T) {
	// Test mapping a function to a slice of integers
	slice := []int{1, 2, 3, 4, 5}
	double := func(x int) int { return x * 2 }
	expected := []int{2, 4, 6, 8, 10}
	result := SliceMap(double, slice)
	if !reflect.DeepEqual(result, expected) {
		t.Errorf("SliceMap returned incorrect result, got: %v, want: %v", result, expected)
	}
}

func TestApplyQuotes(t *testing.T) {
	s := "hello"
	expected := `"hello"`
	result := ApplyQuotes(s)
	if result != expected {
		t.Errorf("ApplyQuotes returned incorrect result, got: %s, want: %s", result, expected)
	}
}
