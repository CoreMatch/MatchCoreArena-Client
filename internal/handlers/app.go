package handlers

import (
	"MatchCoreArena-Client/internal/config"
	"MatchCoreArena-Client/internal/models"
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
	team    *services.TeamService
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
		team:    services.NewTeamService(api),
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

func (h *AppHandler) AddExperience(amount int) error {
	return h.user.AddExperience(amount)
}

// Friend methods
func (h *AppHandler) GetFriends() (interface{}, error) {
	return h.friend.GetFriends()
}

func (h *AppHandler) SendFriendRequest(targetUUID string) (interface{}, error) {
	return h.friend.SendFriendRequest(targetUUID)
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

// Team methods
func (h *AppHandler) CreateTeam(name, description string) (interface{}, error) {
	return h.team.CreateTeam(name, description)
}

func (h *AppHandler) GetTeam(id int64) (interface{}, error) {
	return h.team.GetTeam(id)
}

func (h *AppHandler) DisbandTeam(id int64) error {
	return h.team.DisbandTeam(id)
}

func (h *AppHandler) GetTeamMembers(teamID int64) (interface{}, error) {
	return h.team.GetTeamMembers(teamID)
}

func (h *AppHandler) AddTeamMember(teamID int64, userUUID string, role int) (interface{}, error) {
	return h.team.AddTeamMember(teamID, userUUID, role)
}

func (h *AppHandler) UpdateMemberRole(teamID int64, userUUID string, role int) error {
	return h.team.UpdateMemberRole(teamID, userUUID, role)
}

func (h *AppHandler) RemoveTeamMember(teamID int64, userUUID string) error {
	return h.team.RemoveTeamMember(teamID, userUUID)
}

// Match methods
func (h *AppHandler) ReportMatchResult(report models.TeamReportInput) (interface{}, error) {
	return h.match.ReportMatchResult(report)
}

func (h *AppHandler) GetMatch(id int64) (interface{}, error) {
	return h.match.GetMatch(id)
}

func (h *AppHandler) GetMyMatches(pageNum, pageSize int) (interface{}, error) {
	return h.match.GetMyMatches(pageNum, pageSize)
}
