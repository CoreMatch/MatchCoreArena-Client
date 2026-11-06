package handlers

import (
	"MatchCoreArena-Client/internal/config"
	"MatchCoreArena-Client/internal/services"
	"context"
)

type AppHandler struct {
	ctx     context.Context
	config  *config.Config
	api     *services.APIService
	auth    *services.AuthService
	user    *services.UserService
	friend  *services.FriendService
	ranking *services.RankingService
	match   *services.MatchService
}

func NewAppHandler() *AppHandler {
	cfg, _ := config.LoadConfig()
	api := services.NewAPIService(cfg.ServerURL)

	return &AppHandler{
		config:  cfg,
		api:     api,
		auth:    services.NewAuthService(api),
		user:    services.NewUserService(api),
		friend:  services.NewFriendService(api),
		ranking: services.NewRankingService(api),
		match:   services.NewMatchService(api),
	}
}

func (h *AppHandler) SetContext(ctx context.Context) {
	h.ctx = ctx
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

func (h *AppHandler) GetUserByUUID(uuid string) (interface{}, error) {
	return h.user.GetUserByUUID(uuid)
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
