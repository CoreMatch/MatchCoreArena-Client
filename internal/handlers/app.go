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

// Match handoff methods (INTEROP-SPEC v1 sender side). The handoff never
// carries credentials; it only delivers the settled match summary plus the
// player-configured game server address to SamuelClient on this machine.

func (h *AppHandler) PrepareHandoff(matchID int64, matchType, mapName string) (interface{}, error) {
	if h.interop == nil {
		return nil, fmt.Errorf("match handoff is unavailable on this system")
	}
	return h.interop.PrepareHandoff(interop.MatchInfo{
		MatchID:   matchID,
		MatchType: matchType,
		MapName:   mapName,
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
