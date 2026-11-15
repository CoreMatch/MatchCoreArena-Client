// Package interop implements the sender side of the MatchCore ↔ SamuelClient
// match handoff protocol (INTEROP-SPEC v1, Linux-first).
//
// After matchmaking settles, the client assembles a credential-free handoff
// payload and delivers it to SamuelClient over a loopback HTTP channel:
//
//   - Flow A: the receiver is running (discovery file with a live pid and a
//     matching protocol version) → POST /v1/join directly.
//   - Flow B: the receiver is not running → the sender keeps the payload for
//     pull (GET /v1/handoff/{id} on its own loopback listener), opens the
//     matchcore://join deep link, and retries delivery for 30 seconds.
//
// Degradation states (SamuelClient missing, version mismatch, timeout, game
// server unreachable) are surfaced to the UI together with a copyable
// host:port so the match result is never lost.
package interop

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

const (
	// ProtocolVersion is the supported INTEROP-SPEC major version.
	ProtocolVersion = 1

	receiverDiscoveryFile = "samuel-client.json"
	senderDiscoveryFile   = "mca-client.json"

	deepLinkScheme = "matchcore"

	retryWindow   = 30 * time.Second
	retryInterval = 2 * time.Second
	httpTimeout   = 5 * time.Second
	dialTimeout   = 3 * time.Second
	handoffTTL    = 10 * time.Minute
)

// Delivery states reported to the UI.
const (
	StateIdle            = "idle"
	StateDelivering      = "delivering"
	StateDelivered       = "delivered"
	StateWaitingReceiver = "waiting_receiver"
	StateBusy            = "busy"
	StateTimeout         = "timeout"
	StateNoReceiver      = "no_receiver"
	StateVersionMismatch = "version_mismatch"
	StateMissingConfig   = "missing_config"
	StateError           = "error"
)

// DiscoveryFile is the schema shared by samuel-client.json / mca-client.json.
type DiscoveryFile struct {
	App             string `json:"app"`
	ProtocolVersion int    `json:"protocol_version"`
	PID             int    `json:"pid"`
	Port            int    `json:"port"`
	Token           string `json:"token"`
	CreatedAt       string `json:"created_at"`
}

// JoinTarget is where the receiver launches the game into.
type JoinTarget struct {
	Host string `json:"host"`
	Port int    `json:"port"`
}

// HandoffMatch is the match summary carried by the payload. It never
// contains credentials or tokens (INTEROP-SPEC §5 credential firewall).
type HandoffMatch struct {
	MatchID    string     `json:"match_id"`
	Mode       string     `json:"mode"`
	MapName    string     `json:"map_name,omitempty"`
	JoinTarget JoinTarget `json:"join_target"`
}

// HandoffPayload is the INTEROP-SPEC v1 payload.
type HandoffPayload struct {
	Version   int          `json:"version"`
	HandoffID string       `json:"handoff_id"`
	Nonce     string       `json:"nonce"`
	CreatedAt string       `json:"created_at"`
	ExpiresAt string       `json:"expires_at"`
	Match     HandoffMatch `json:"match"`
}

// Status is the delivery state consumed by the frontend.
type Status struct {
	State         string `json:"state"`
	HandoffID     string `json:"handoff_id,omitempty"`
	MatchID       string `json:"match_id,omitempty"`
	Host          string `json:"host,omitempty"`
	Port          int    `json:"port,omitempty"`
	GameReachable bool   `json:"game_reachable"`
	Detail        string `json:"detail,omitempty"`
}

// MatchInfo is everything the sender needs from the settled match.
// ServerHost/ServerPort carry the join_target the arena server attached to
// the formed group (contract v1.6.0); they take precedence over the local
// fallback configuration. Empty values mean "server provided nothing".
type MatchInfo struct {
	MatchID    int64
	MatchType  string
	MapName    string
	ServerHost string
	ServerPort int
}

// GameServer is the player-configured join target.
type GameServer struct {
	Host string
	Port int
}

type pendingHandoff struct {
	payload  *HandoffPayload
	consumed bool
}

// Manager owns the sender listener, the discovery file and the single
// pending-handoff slot (INTEROP-SPEC §6 single-slot rule, sender side).
type Manager struct {
	mu       sync.Mutex
	dir      string
	token    string
	listener net.Listener
	pending  *pendingHandoff
	status   Status
	gameSrv  func() GameServer // reads the current game-server config
	client   *http.Client
}

// NewManager creates a sender manager. gameServer must return the currently
// configured game server address at call time.
func NewManager(gameServer func() GameServer) (*Manager, error) {
	token, err := randomHex(32)
	if err != nil {
		return nil, fmt.Errorf("interop: generate token: %w", err)
	}
	dir, err := discoveryDir()
	if err != nil {
		return nil, err
	}
	return &Manager{
		dir:     dir,
		token:   token,
		status:  Status{State: StateIdle},
		gameSrv: gameServer,
		client:  &http.Client{Timeout: httpTimeout},
	}, nil
}

// Start binds the loopback listener and publishes mca-client.json.
func (m *Manager) Start() error {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return fmt.Errorf("interop: bind loopback: %w", err)
	}
	m.mu.Lock()
	m.listener = ln
	m.mu.Unlock()

	if err := m.writeDiscovery(ln.Addr().(*net.TCPAddr).Port); err != nil {
		ln.Close()
		return err
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/v1/health", m.handleHealth)
	mux.HandleFunc("/v1/handoff/", m.handlePull)
	go func() { _ = http.Serve(ln, mux) }()
	return nil
}

// Stop removes the discovery file (best effort) and closes the listener.
func (m *Manager) Stop() {
	_ = os.Remove(filepath.Join(m.dir, senderDiscoveryFile))
	m.mu.Lock()
	ln := m.listener
	m.mu.Unlock()
	if ln != nil {
		ln.Close()
	}
}

// PrepareHandoff assembles the payload for a settled match and starts
// delivery. It returns the initial status.
func (m *Manager) PrepareHandoff(info MatchInfo) Status {
	m.mu.Lock()
	m.pending = nil
	m.status = Status{State: StateDelivering, MatchID: fmt.Sprintf("m-%d", info.MatchID)}
	m.mu.Unlock()

	go m.deliver(info)
	return m.Status()
}

// RetryHandoff re-attempts delivery of the stored match info (e.g. after the
// game server address was configured or SamuelClient was installed).
func (m *Manager) RetryHandoff(info MatchInfo) Status {
	return m.PrepareHandoff(info)
}

// Status returns a snapshot of the delivery state.
func (m *Manager) Status() Status {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.status
}

// deliver runs the delivery state machine (flows A/B of INTEROP-SPEC §7).
// Join target precedence: server-provided join_target from the formed
// group, then the local fallback configuration, then the manual-join
// degradation (missing_config).
func (m *Manager) deliver(info MatchInfo) {
	srv := GameServer{Host: info.ServerHost, Port: info.ServerPort}
	if !validHost(srv.Host) || srv.Port < 1 || srv.Port > 65535 {
		// The server did not provide a (usable) join target for this
		// match — fall back to the locally configured address.
		srv = m.gameSrv()
	}
	if !validHost(srv.Host) || srv.Port < 1 || srv.Port > 65535 {
		m.setStatus(Status{
			State:   StateMissingConfig,
			MatchID: fmt.Sprintf("m-%d", info.MatchID),
			Detail:  "no game server address from the arena server or the local settings",
		})
		return
	}

	reachable := dialReachable(srv.Host, srv.Port)

	payload := &HandoffPayload{
		Version:   ProtocolVersion,
		HandoffID: newUUID(),
		Nonce:     newUUID(),
		CreatedAt: time.Now().Format(time.RFC3339),
		ExpiresAt: time.Now().Add(handoffTTL).Format(time.RFC3339),
		Match: HandoffMatch{
			MatchID:    fmt.Sprintf("m-%d", info.MatchID),
			Mode:       info.MatchType,
			MapName:    truncate(info.MapName, 64),
			JoinTarget: JoinTarget{Host: srv.Host, Port: srv.Port},
		},
	}

	m.mu.Lock()
	m.pending = &pendingHandoff{payload: payload}
	m.status = Status{
		State:         StateDelivering,
		HandoffID:     payload.HandoffID,
		MatchID:       payload.Match.MatchID,
		Host:          srv.Host,
		Port:          srv.Port,
		GameReachable: reachable,
	}
	m.mu.Unlock()

	// Flow A: receiver already running.
	if state, detail := m.tryPush(payload); state == StateDelivered || state == StateBusy || state == StateVersionMismatch {
		m.setStatus(Status{
			State: state, HandoffID: payload.HandoffID, MatchID: payload.Match.MatchID,
			Host: srv.Host, Port: srv.Port, GameReachable: reachable, Detail: detail,
		})
		return
	}

	// Flow B: wake the receiver via the deep link, then keep retrying.
	if err := openDeepLink(payload.HandoffID); err != nil {
		m.setStatus(Status{
			State: StateNoReceiver, HandoffID: payload.HandoffID, MatchID: payload.Match.MatchID,
			Host: srv.Host, Port: srv.Port, GameReachable: reachable,
			Detail: "SamuelClient is not installed or not registered for matchcore:// links (" + err.Error() + ")",
		})
		return
	}

	m.setStatus(Status{
		State: StateWaitingReceiver, HandoffID: payload.HandoffID, MatchID: payload.Match.MatchID,
		Host: srv.Host, Port: srv.Port, GameReachable: reachable,
		Detail: "waiting for SamuelClient to start",
	})

	deadline := time.Now().Add(retryWindow)
	for time.Now().Before(deadline) {
		time.Sleep(retryInterval)

		m.mu.Lock()
		consumed := m.pending != nil && m.pending.consumed
		m.mu.Unlock()
		if consumed {
			// The receiver woke up and pulled the payload from us.
			m.setStatus(Status{
				State: StateDelivered, HandoffID: payload.HandoffID, MatchID: payload.Match.MatchID,
				Host: srv.Host, Port: srv.Port, GameReachable: reachable,
			})
			return
		}

		if state, detail := m.tryPush(payload); state == StateDelivered || state == StateBusy || state == StateVersionMismatch {
			m.setStatus(Status{
				State: state, HandoffID: payload.HandoffID, MatchID: payload.Match.MatchID,
				Host: srv.Host, Port: srv.Port, GameReachable: reachable, Detail: detail,
			})
			return
		}
	}

	m.setStatus(Status{
		State: StateTimeout, HandoffID: payload.HandoffID, MatchID: payload.Match.MatchID,
		Host: srv.Host, Port: srv.Port, GameReachable: reachable,
		Detail: "SamuelClient did not come up in time — retry or join manually",
	})
}

// tryPush attempts one Flow-A push. It returns the resulting state plus a
// readable detail for non-success outcomes.
func (m *Manager) tryPush(payload *HandoffPayload) (string, string) {
	disc, ok := readDiscovery(filepath.Join(m.dir, receiverDiscoveryFile))
	if !ok {
		return StateNoReceiver, ""
	}
	if disc.ProtocolVersion != ProtocolVersion {
		return StateVersionMismatch, fmt.Sprintf(
			"SamuelClient speaks protocol version %d, this client supports %d — update the out-of-date app",
			disc.ProtocolVersion, ProtocolVersion)
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return StateError, "failed to encode handoff payload"
	}
	url := fmt.Sprintf("http://127.0.0.1:%d/v1/join", disc.Port)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return StateError, "failed to build handoff request"
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+disc.Token)

	resp, err := m.client.Do(req)
	if err != nil {
		return StateNoReceiver, "" // discovery stale or listener gone
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusOK:
		m.markConsumed()
		return StateDelivered, ""
	case http.StatusServiceUnavailable:
		return StateBusy, "SamuelClient is busy with another handoff — try again"
	case http.StatusUnprocessableEntity:
		return StateVersionMismatch, "SamuelClient rejected the payload (version mismatch) — update the out-of-date app"
	default:
		return StateError, fmt.Sprintf("SamuelClient answered HTTP %d", resp.StatusCode)
	}
}

func (m *Manager) markConsumed() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.pending != nil {
		m.pending.consumed = true
	}
}

func (m *Manager) setStatus(s Status) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.status = s
}

// handleHealth answers the unauthenticated liveness probe.
func (m *Manager) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]interface{}{
		"app": "mca-client", "protocol_version": ProtocolVersion, "ready": true,
	})
}

// handlePull serves GET /v1/handoff/{id} once (first successful read
// consumes the payload; INTEROP-SPEC §4.2).
func (m *Manager) handlePull(w http.ResponseWriter, r *http.Request) {
	if !m.authorized(r) {
		writeError(w, http.StatusUnauthorized, "unauthorized", "missing or invalid bearer token")
		return
	}
	id := strings.TrimPrefix(r.URL.Path, "/v1/handoff/")

	m.mu.Lock()
	pending := m.pending
	if pending != nil && !pending.consumed && pending.payload.HandoffID == id &&
		time.Now().Before(mustParseTime(pending.payload.ExpiresAt)) {
		pending.consumed = true
		payload := pending.payload
		m.mu.Unlock()
		writeJSON(w, http.StatusOK, payload)
		return
	}
	m.mu.Unlock()
	writeError(w, http.StatusNotFound, "gone", "handoff unknown, consumed, or expired")
}

func (m *Manager) authorized(r *http.Request) bool {
	const prefix = "Bearer "
	auth := r.Header.Get("Authorization")
	return strings.HasPrefix(auth, prefix) && strings.TrimPrefix(auth, prefix) == m.token
}

func (m *Manager) writeDiscovery(port int) error {
	if err := os.MkdirAll(m.dir, 0o700); err != nil {
		return fmt.Errorf("interop: create discovery dir: %w", err)
	}
	disc := DiscoveryFile{
		App:             "mca-client",
		ProtocolVersion: ProtocolVersion,
		PID:             os.Getpid(),
		Port:            port,
		Token:           m.token,
		CreatedAt:       time.Now().Format(time.RFC3339),
	}
	data, err := json.MarshalIndent(disc, "", "  ")
	if err != nil {
		return err
	}
	return atomicWrite(filepath.Join(m.dir, senderDiscoveryFile), data, 0o600)
}

// readDiscovery loads a discovery file and verifies the pid is alive;
// stale files (dead pid, malformed) report ok=false.
func readDiscovery(path string) (DiscoveryFile, bool) {
	var disc DiscoveryFile
	data, err := os.ReadFile(path)
	if err != nil {
		return disc, false
	}
	if err := json.Unmarshal(data, &disc); err != nil {
		return disc, false
	}
	if disc.Port <= 0 || disc.Token == "" || !pidAlive(disc.PID) {
		return disc, false
	}
	return disc, true
}

func discoveryDir() (string, error) {
	if dir := os.Getenv("XDG_RUNTIME_DIR"); dir != "" {
		return filepath.Join(dir, "matchcore-interop"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("interop: resolve home dir: %w", err)
	}
	return filepath.Join(home, ".config", "matchcore-interop"), nil
}

func pidAlive(pid int) bool {
	if pid <= 0 {
		return false
	}
	if runtime.GOOS == "linux" {
		_, err := os.Stat(fmt.Sprintf("/proc/%d", pid))
		return err == nil
	}
	// Best effort on other unix-like systems. Windows remains a documented
	// gap (INTEROP-SPEC §10): Signal(0) is unsupported there, so discovery
	// is treated as stale and the flow degrades to manual join.
	p, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	return p.Signal(signalZero()) == nil
}

func openDeepLink(handoffID string) error {
	url := fmt.Sprintf("%s://join?handoff_id=%s&v=%d", deepLinkScheme, handoffID, ProtocolVersion)
	if runtime.GOOS != "linux" {
		// Deep-link registration is a documented gap on Windows/macOS
		// (INTEROP-SPEC §10); degrade to manual join.
		return fmt.Errorf("deep-link wake-up is only implemented on Linux (running on %s)", runtime.GOOS)
	}
	cmd := exec.Command("xdg-open", url)
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("xdg-open unavailable: %w", err)
	}
	go func() { _ = cmd.Wait() }()
	return nil
}

func dialReachable(host string, port int) bool {
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, strconv.Itoa(port)), dialTimeout)
	if err != nil {
		return false
	}
	conn.Close()
	return true
}

var hostNameRe = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$`)

// validHost mirrors the receiver's join_target.host gate (INTEROP-SPEC §5):
// an IP literal or an RFC-1123 hostname, ≤253 chars.
func validHost(host string) bool {
	if host == "" || len(host) > 253 {
		return false
	}
	if net.ParseIP(host) != nil {
		return true
	}
	return hostNameRe.MatchString(strings.ToLower(host))
}

func atomicWrite(path string, data []byte, perm os.FileMode) error {
	tmp, err := os.CreateTemp(filepath.Dir(path), ".tmp-*")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName) // no-op after successful rename

	if err := tmp.Chmod(perm); err != nil {
		tmp.Close()
		return err
	}
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}

func randomHex(n int) (string, error) {
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// newUUID returns a random UUIDv4-shaped string (handoff ids and nonces).
func newUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40 // version 4
	b[8] = (b[8] & 0x3f) | 0x80 // variant 10
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

func truncate(s string, max int) string {
	if len(s) > max {
		return s[:max]
	}
	return s
}

// signalZero is the "check process existence" signal (0). On Windows the
// signal itself is representable but (*os.Process).Signal rejects it, which
// is exactly the documented discovery gap there.
func signalZero() os.Signal {
	return syscall.Signal(0)
}

func mustParseTime(s string) time.Time {
	t, err := time.Parse(time.RFC3339, s)
	if err != nil {
		return time.Time{}
	}
	return t
}

func writeJSON(w http.ResponseWriter, code int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, code int, errCode, message string) {
	writeJSON(w, code, map[string]interface{}{
		"error": map[string]string{"code": errCode, "message": message},
	})
}
