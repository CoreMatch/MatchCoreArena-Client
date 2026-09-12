package handlers
package handlers

import (
	"context"
	"MatchCoreArena-Client/internal/config"
	"MatchCoreArena-Client/internal/services"
)

type AppHandler struct {
	ctx     context.Context
	config  *config.Config
	api     *services.APIService
	auth    *services.AuthService
	user    *services.UserService
	friend  *services.FriendService
	ranking *services.RankingService
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

func (h *AppHandler) GetUserByUID(uid int64) (interface{}, error) {
	return h.user.GetUserByUID(uid)
}

func (h *AppHandler) AddExperience(amount int) error {
	return h.user.AddExperience(amount)
}

// Friend methods
func (h *AppHandler) GetFriends() (interface{}, error) {
	return h.friend.GetFriends()
}

func (h *AppHandler) SendFriendRequest(targetUID int64) (interface{}, error) {
	return h.friend.SendFriendRequest(targetUID)
}

func (h *AppHandler) AcceptFriendRequest(friendID int64) error {
	return h.friend.AcceptFriendRequest(friendID)
}

func (h *AppHandler) RejectFriendRequest(friendID int64) error {
	return h.friend.RejectFriendRequest(friendID)
}

func (h *AppHandler) DeleteFriend(friendID int64) error {
	return h.friend.DeleteFriend(friendID)
}

// Ranking methods
func (h *AppHandler) GetTopRankings(rankType string, limit, season int) (interface{}, error) {
	return h.ranking.GetTopRankings(rankType, limit, season)
}

func (h *AppHandler) GetMyRanking(rankType string, season int) (interface{}, error) {
	return h.ranking.GetMyRanking(rankType, season)
}