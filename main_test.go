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

func TestGreet(t *testing.T) {
	app := NewApp()
	greeting := app.Greet("World")
	expected := "Hello World! Welcome to MatchCoreArena!"
	if greeting != expected {
		t.Errorf("Expected %s, got %s", expected, greeting)
	}
}
