package handlers

import (
	"MatchCoreArena-Client/internal/config"
	"MatchCoreArena-Client/internal/interop"
	"MatchCoreArena-Client/internal/services"
	"context"
	"fmt"
	"sync"
)

type AppHandler struct {
	ctx         context.Context
	config      *config.Config
	cfgMu       sync.Mutex
	api         *services.APIService
	auth        *services.AuthService
	user        *services.UserService
	friend      *services.FriendService
	ranking     *services.RankingService
	match       *services.MatchService
	matchmaking *services.MatchmakingService
	interop     *interop.Manager
}

func NewAppHandler() *AppHandler {
	cfg, _ := config.LoadConfig()
	if cfg == nil {
		cfg = &config.Config{ServerURL: "https://arena.mcnb.dev/"}
	}
	api := services.NewAPIService(cfg.ServerURL)

	h := &AppHandler{
		config:      cfg,
		api:         api,
		auth:        services.NewAuthService(api),
		user:        services.NewUserService(api),
		friend:      services.NewFriendService(api),
		ranking:     services.NewRankingService(api),
		match:       services.NewMatchService(api),
		matchmaking: services.NewMatchmakingService(api),
	}

	// Sender side of the match handoff protocol (INTEROP-SPEC v1). A failure
	// here (e.g. no writable runtime dir) only disables the handoff, never
	// the rest of the client.
	if mgr, err := interop.NewManager(h.currentGameServer); err == nil {
		h.interop = mgr
	}

	return h
}

func (h *AppHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
}

// StartInterop publishes the sender discovery file and loopback listener.
func (h *AppHandler) StartInterop() {
	if h.interop != nil {
		_ = h.interop.Start()
	}
}

// StopInterop removes the discovery file and closes the listener.
func (h *AppHandler) StopInterop() {
	if h.interop != nil {
		h.interop.Stop()
	}
}

func (h *AppHandler) SetToken(token string) {
	h.api.SetToken(token)
}

// Auth methods
func (h *AppHandler) Login(email, password string) (interface{}, error) {
	return h.auth.Login(email, password)
}

func (h *AppHandler) VerifyTOTP(loginTicket, passcode string) (interface{}, error) {
	return h.auth.VerifyTOTP(loginTicket, passcode)
}

func (h *AppHandler) RefreshToken(refreshToken string) (interface{}, error) {
	return h.auth.RefreshToken(refreshToken)
}

func (h *AppHandler) Logout() error {
	return h.auth.Logout()
}

// User methods
func (h *AppHandler) GetCurrentUser() (interface{}, error) {
	return h.user.GetCurrentUser()
}

// Friend methods
func (h *AppHandler) GetFriends() (interface{}, error) {
	return h.friend.GetFriends()
}

// Ranking methods
func (h *AppHandler) GetTopRankings(rankType string, limit, season int) (interface{}, error) {
	return h.ranking.GetTopRankings(rankType, limit, season)
}

func (h *AppHandler) GetMyRanking(rankType string, season int) (interface{}, error) {
	return h.ranking.GetMyRanking(rankType, season)
}

// GetRankingTiers returns the display-only tier ladder (contract v1.7.0);
// empty array = no tiers configured, no progress bar.
func (h *AppHandler) GetRankingTiers() (interface{}, error) {
	return h.ranking.GetRankingTiers()
}

// Match methods (read-only)
func (h *AppHandler) GetMatch(id int64) (interface{}, error) {
	return h.match.GetMatch(id)
}

func (h *AppHandler) GetMyMatches(pageNum, pageSize int) (interface{}, error) {
	return h.match.GetMyMatches(pageNum, pageSize)
}

// Matchmaking methods (the player's own queue operations)
func (h *AppHandler) JoinMatchmaking(matchType string, partyMembers []string) (interface{}, error) {
	return h.matchmaking.Join(matchType, partyMembers)
}

func (h *AppHandler) LeaveMatchmaking() error {
	return h.matchmaking.Leave()
}

func (h *AppHandler) GetMatchmakingStatus() (interface{}, error) {
	return h.matchmaking.Status()
}

// Party invite methods (contract 1.11.0). The invite flow is a precondition
// for party matchmaking: all non-caller members must have accepted an invite
// from the caller for the same match_type before the caller can put them in
// party_members for join. These methods expose that state machine.

// InviteParty sends party invites for a match type (only pending, no join).
// memberUUIDs must not include the caller; duplicates and unknown UUIDs fail.
func (h *AppHandler) InviteParty(matchType string, memberUUIDs []string) (interface{}, error) {
	return h.matchmaking.Invite(matchType, memberUUIDs)
}

// MyPartyInvites returns invites the user sent or received (newest first, max 50).
func (h *AppHandler) MyPartyInvites() (interface{}, error) {
	return h.matchmaking.MyInvites()
}

// AcceptPartyInvite accepts an incoming invite (terminal state, invitee only).
func (h *AppHandler) AcceptPartyInvite(id int64) (interface{}, error) {
	return h.matchmaking.AcceptInvite(id)
}

// RejectPartyInvite rejects an incoming invite (terminal state, invitee only).
func (h *AppHandler) RejectPartyInvite(id int64) (interface{}, error) {
	return h.matchmaking.RejectInvite(id)
}

// Match handoff methods (INTEROP-SPEC v1 sender side). The handoff never
// carries credentials; it only delivers the settled match summary plus the
// player-configured game server address to SamuelClient on this machine.

// PrepareHandoff starts the handoff delivery for a settled match.
// serverHost/serverPort carry the join_target the arena server attached to
// the formed group (may be empty); the local game-server configuration is
// the fallback.
func (h *AppHandler) PrepareHandoff(matchID int64, matchType, mapName, serverHost string, serverPort int) (interface{}, error) {
	if h.interop == nil {
		return nil, fmt.Errorf("match handoff is unavailable on this system")
	}
	return h.interop.PrepareHandoff(interop.MatchInfo{
		MatchID:    matchID,
		MatchType:  matchType,
		MapName:    mapName,
		ServerHost: serverHost,
		ServerPort: serverPort,
	}), nil
}

func (h *AppHandler) GetHandoffStatus() (interface{}, error) {
	if h.interop == nil {
		return nil, fmt.Errorf("match handoff is unavailable on this system")
	}
	return h.interop.Status(), nil
}

func (h *AppHandler) GetGameServerConfig() (interface{}, error) {
	h.cfgMu.Lock()
	defer h.cfgMu.Unlock()
	return map[string]interface{}{
		"host": h.config.GameServerHost,
		"port": h.config.GameServerPort,
	}, nil
}

func (h *AppHandler) SetGameServerConfig(host string, port int) error {
	if port < 1 || port > 65535 {
		return fmt.Errorf("port must be between 1 and 65535")
	}
	h.cfgMu.Lock()
	defer h.cfgMu.Unlock()
	h.config.GameServerHost = host
	h.config.GameServerPort = port
	return config.SaveConfig(h.config)
}

func (h *AppHandler) currentGameServer() interop.GameServer {
	h.cfgMu.Lock()
	defer h.cfgMu.Unlock()
	return interop.GameServer{Host: h.config.GameServerHost, Port: h.config.GameServerPort}
}
