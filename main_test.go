package main

import (
	"os"
	"path/filepath"
	"reflect"
	"regexp"
	"strings"
	"testing"
)

func TestAppCreation(t *testing.T) {
	app := NewApp()
	if app == nil {
		t.Fatal("Failed to create App")
	}
}

// TestAppBoundSurfaceIsReadOnly pins the Wails bound surface to exactly the
// allow-list. Policy (author-directed): session auth, read queries, the
// player's own matchmaking queue operations, the local match-handoff
// delivery (loopback-only, credential-free) and local settings are allowed;
// match reporting and any other match-data write surface are forbidden.
// Adding, renaming or removing a bound method forces a deliberate update of
// this list. See knowledge 0011 for the invariant and the re-check
// procedure.
func TestAppBoundSurfaceIsReadOnly(t *testing.T) {
	allowed := map[string]struct{}{
		// Session auth
		"Login": {}, "VerifyTOTP": {}, "RefreshToken": {}, "Logout": {}, "SetToken": {},
		// Read-only queries
		"GetCurrentUser": {}, "GetFriends": {},
		"GetTopRankings": {}, "GetMyRanking": {},
		// GetRankingTiers: display-only tier ladder (contract v1.7.0),
		// pure read of server configuration; no settlement semantics.
		"GetRankingTiers": {},
		"GetMatch": {}, "GetMyMatches": {},
		// Player's own matchmaking queue operations (no match-data writes)
		"JoinMatchmaking": {}, "LeaveMatchmaking": {}, "GetMatchmakingStatus": {},
		// Party invite state machine (contract 1.11.0): pre-queue consent
		// flow — writes only matchmaking_party_invites rows, never scores.
		"InviteParty": {}, "MyPartyInvites": {},
		"AcceptPartyInvite": {}, "RejectPartyInvite": {},
		// Local match handoff (loopback IPC, credential-free) + local settings
		"PrepareHandoff": {}, "GetHandoffStatus": {},
		"GetGameServerConfig": {}, "SetGameServerConfig": {},
	}

	typ := reflect.TypeOf(&App{})
	seen := make(map[string]struct{}, typ.NumMethod())
	for i := 0; i < typ.NumMethod(); i++ {
		name := typ.Method(i).Name
		seen[name] = struct{}{}
		if _, ok := allowed[name]; !ok {
			t.Errorf("unexpected bound method %q: the client is read-only; write bindings must not be added", name)
		}
	}
	for name := range allowed {
		if _, ok := seen[name]; !ok {
			t.Errorf("allowed bound method %q is missing from App", name)
		}
	}
}

// TestFrontendMakesNoDirectNetworkCalls pins the invariant that all server
// communication goes through the Go layer: no fetch/XHR/absolute URLs in the
// frontend sources.
func TestFrontendMakesNoDirectNetworkCalls(t *testing.T) {
	patterns := []string{"fetch(", "axios", "XMLHttpRequest", "http://", "https://"}

	err := filepath.Walk("frontend/src", func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			return nil
		}
		if !strings.HasSuffix(path, ".ts") && !strings.HasSuffix(path, ".tsx") {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		for _, p := range patterns {
			if strings.Contains(string(data), p) {
				t.Errorf("%s contains %q: the frontend must not make network calls directly; use the Go bindings", path, p)
			}
		}
		return nil
	})
	if err != nil {
		t.Fatalf("failed to walk frontend/src: %v", err)
	}
}

// TestWailsBindingsMatchBoundSurface pins that the generated binding module
// and the Go bound surface stay in sync: no binding may reference a method
// that no longer exists on App (stale binding), and every bound method must
// have a binding (otherwise it is dead surface).
func TestWailsBindingsMatchBoundSurface(t *testing.T) {
	data, err := os.ReadFile("frontend/wailsjs/go/main/App.js")
	if err != nil {
		t.Fatalf("failed to read generated bindings: %v", err)
	}

	bound := make(map[string]struct{})
	typ := reflect.TypeOf(&App{})
	for i := 0; i < typ.NumMethod(); i++ {
		bound[typ.Method(i).Name] = struct{}{}
	}

	re := regexp.MustCompile(`export function (\w+)\(`)
	for _, m := range re.FindAllStringSubmatch(string(data), -1) {
		name := m[1]
		if _, ok := bound[name]; !ok {
			t.Errorf("binding %q has no bound method on App (stale generated binding)", name)
			continue
		}
		delete(bound, name)
	}
	for name := range bound {
		t.Errorf("bound method %q has no generated binding in frontend/wailsjs/go/main/App.js", name)
	}
}
