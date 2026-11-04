package main

import (
	"testing"
)

func TestAppCreation(t *testing.T) {
	app := NewApp()
	if app == nil {
		t.Fatal("Failed to create App")
	}
}
