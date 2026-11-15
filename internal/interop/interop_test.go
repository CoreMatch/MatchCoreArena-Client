package interop

import (
	"encoding/json"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestValidHost(t *testing.T) {
	valid := []string{"bw.match.local", "example.com", "a", "127.0.0.1", "::1"}
	for _, h := range valid {
		if !validHost(h) {
			t.Errorf("expected %q to be valid", h)
		}
	}
	invalid := []string{"", "bad host", "host;rm", "https://x", "a/b", strings.Repeat("a", 254), "host%20"}
	for _, h := range invalid {
		if validHost(h) {
			t.Errorf("expected %q to be invalid", h)
		}
	}
}

func TestNewUUIDShape(t *testing.T) {
	u := newUUID()
	if len(u) != 36 {
		t.Fatalf("unexpected uuid length: %q", u)
	}
	if u[14] != '4' {
		t.Fatalf("expected version 4, got %q", u)
	}
}

func TestPrepareHandoffMissingConfig(t *testing.T) {
	mgr, err := NewManager(func() GameServer { return GameServer{} })
	if err != nil {
		t.Fatalf("NewManager failed: %v", err)
	}
	mgr.dir = t.TempDir()

	st := mgr.PrepareHandoff(MatchInfo{MatchID: 1, MatchType: "1v1"})
	// deliver runs async; the missing-config state is set quickly.
	deadline := time.Now().Add(2 * time.Second)
	for st.State != StateMissingConfig && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
		st = mgr.Status()
	}
	if st.State != StateMissingConfig {
		t.Fatalf("expected missing_config, got %+v", st)
	}
}

// TestPushFlowDelivers covers flow A: a live receiver discovery file plus a
// fake receiver accepting the push.
func TestPushFlowDelivers(t *testing.T) {
	var gotAuth string
	var gotBody HandoffPayload
	receiver := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/join" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		gotAuth = r.Header.Get("Authorization")
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &gotBody)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"accepted","handoff_id":"x"}`))
	}))
	defer receiver.Close()

	parsed, err := url.Parse(receiver.URL)
	if err != nil {
		t.Fatalf("failed to parse receiver URL: %v", err)
	}
	port, err := strconv.Atoi(parsed.Port())
	if err != nil {
		t.Fatalf("failed to parse receiver port: %v", err)
	}

	dir := t.TempDir()
	disc := DiscoveryFile{
		App: "samuel-client", ProtocolVersion: ProtocolVersion,
		PID: os.Getpid(), Port: port, Token: "recv-token",
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	data, _ := json.Marshal(disc)
	if err := os.WriteFile(filepath.Join(dir, receiverDiscoveryFile), data, 0o600); err != nil {
		t.Fatalf("failed to write discovery: %v", err)
	}

	mgr, err := NewManager(func() GameServer { return GameServer{Host: "bw.match.local", Port: 25565} })
	if err != nil {
		t.Fatalf("NewManager failed: %v", err)
	}
	mgr.dir = dir

	st := mgr.PrepareHandoff(MatchInfo{MatchID: 42, MatchType: "2v2", MapName: "Aquarium"})
	deadline := time.Now().Add(3 * time.Second)
	for st.State != StateDelivered && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
		st = mgr.Status()
	}
	if st.State != StateDelivered {
		t.Fatalf("expected delivered, got %+v", st)
	}
	if gotAuth != "Bearer recv-token" {
		t.Fatalf("receiver did not get the receiver token: %q", gotAuth)
	}
	if gotBody.Version != ProtocolVersion || gotBody.Match.MatchID != "m-42" ||
		gotBody.Match.Mode != "2v2" || gotBody.Match.JoinTarget.Host != "bw.match.local" ||
		gotBody.Match.JoinTarget.Port != 25565 {
		t.Fatalf("unexpected payload: %+v", gotBody)
	}
	if gotBody.ExpiresAt == "" || gotBody.Nonce == "" || gotBody.HandoffID == "" {
		t.Fatalf("payload missing ids/expiry: %+v", gotBody)
	}
}

// TestServerProvidedJoinTargetWins covers the precedence rule (contract
// v1.6.0): the join_target attached to the formed group beats the local
// fallback configuration.
func TestServerProvidedJoinTargetWins(t *testing.T) {
	var gotBody HandoffPayload
	receiver := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(body, &gotBody)
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"accepted","handoff_id":"x"}`))
	}))
	defer receiver.Close()

	parsed, err := url.Parse(receiver.URL)
	if err != nil {
		t.Fatalf("failed to parse receiver URL: %v", err)
	}
	port, err := strconv.Atoi(parsed.Port())
	if err != nil {
		t.Fatalf("failed to parse receiver port: %v", err)
	}

	dir := t.TempDir()
	disc := DiscoveryFile{
		App: "samuel-client", ProtocolVersion: ProtocolVersion,
		PID: os.Getpid(), Port: port, Token: "recv-token",
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	data, _ := json.Marshal(disc)
	if err := os.WriteFile(filepath.Join(dir, receiverDiscoveryFile), data, 0o600); err != nil {
		t.Fatalf("failed to write discovery: %v", err)
	}

	// Local fallback config exists but must lose to the server-provided target.
	mgr, err := NewManager(func() GameServer { return GameServer{Host: "fallback.local", Port: 11111} })
	if err != nil {
		t.Fatalf("NewManager failed: %v", err)
	}
	mgr.dir = dir

	st := mgr.PrepareHandoff(MatchInfo{
		MatchID: 7, MatchType: "1v1",
		ServerHost: "arena-provided.example", ServerPort: 25999,
	})
	deadline := time.Now().Add(3 * time.Second)
	for st.State != StateDelivered && time.Now().Before(deadline) {
		time.Sleep(10 * time.Millisecond)
		st = mgr.Status()
	}
	if st.State != StateDelivered {
		t.Fatalf("expected delivered, got %+v", st)
	}
	if gotBody.Match.JoinTarget.Host != "arena-provided.example" || gotBody.Match.JoinTarget.Port != 25999 {
		t.Fatalf("expected the server-provided join target to win, got %+v", gotBody.Match.JoinTarget)
	}
	if st.Host != "arena-provided.example" || st.Port != 25999 {
		t.Fatalf("status should expose the used join target, got %+v", st)
	}
}

// TestPullFlowServesOnce covers the sender's pull endpoint: the pending
// payload is served once with the sender token, then answered 404 gone.
func TestPullFlowServesOnce(t *testing.T) {
	mgr, err := NewManager(func() GameServer { return GameServer{Host: "bw.match.local", Port: 25565} })
	if err != nil {
		t.Fatalf("NewManager failed: %v", err)
	}
	mgr.dir = t.TempDir()
	if err := mgr.Start(); err != nil {
		t.Fatalf("Start failed: %v", err)
	}
	defer mgr.Stop()

	// Seed a pending payload directly (skip the async delivery machine).
	payload := &HandoffPayload{
		Version: ProtocolVersion, HandoffID: newUUID(), Nonce: newUUID(),
		CreatedAt: time.Now().Format(time.RFC3339),
		ExpiresAt: time.Now().Add(time.Minute).Format(time.RFC3339),
		Match:     HandoffMatch{MatchID: "m-7", Mode: "1v1", JoinTarget: JoinTarget{Host: "bw.match.local", Port: 25565}},
	}
	mgr.mu.Lock()
	mgr.pending = &pendingHandoff{payload: payload}
	mgr.mu.Unlock()

	port := mgr.listener.Addr().(*net.TCPAddr).Port
	base := "http://127.0.0.1:" + strconv.Itoa(port) + "/v1/handoff/" + payload.HandoffID

	// Wrong token → 401
	req, _ := http.NewRequest(http.MethodGet, base, nil)
	req.Header.Set("Authorization", "Bearer wrong")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("pull request failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}

	// Right token → 200 once
	req, _ = http.NewRequest(http.MethodGet, base, nil)
	req.Header.Set("Authorization", "Bearer "+mgr.token)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("pull request failed: %v", err)
	}
	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	var got HandoffPayload
	if err := json.Unmarshal(body, &got); err != nil || got.HandoffID != payload.HandoffID {
		t.Fatalf("unexpected pulled payload: %v / %+v", err, got)
	}

	// Second read → 404 gone
	req, _ = http.NewRequest(http.MethodGet, base, nil)
	req.Header.Set("Authorization", "Bearer "+mgr.token)
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("pull request failed: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("expected 404 on second pull, got %d", resp.StatusCode)
	}
}

// TestStaleDiscoveryIgnored verifies that a discovery file with a dead pid
// is not trusted.
func TestStaleDiscoveryIgnored(t *testing.T) {
	dir := t.TempDir()
	disc := DiscoveryFile{
		App: "samuel-client", ProtocolVersion: ProtocolVersion,
		PID: 999999999, Port: 1, Token: "t",
	}
	data, _ := json.Marshal(disc)
	path := filepath.Join(dir, receiverDiscoveryFile)
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatalf("failed to write discovery: %v", err)
	}
	if _, ok := readDiscovery(path); ok {
		t.Fatal("expected the stale discovery file (dead pid) to be ignored")
	}
}
