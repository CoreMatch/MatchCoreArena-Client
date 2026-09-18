package main

import (
	"MatchCoreArena-Client/internal/handlers"
	"MatchCoreArena-Client/internal/models"
	"context"
)

// App struct
type App struct {
	ctx     context.Context
	handler *handlers.AppHandler
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		handler: handlers.NewAppHandler(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.handler.SetContext(ctx)
}

// Auth methods
func (a *App) Login(email, password string) (interface{}, error) {
	return a.handler.Login(email, password)
}

func (a *App) VerifyTOTP(loginTicket, passcode string) (interface{}, error) {
	return a.handler.VerifyTOTP(loginTicket, passcode)
}

func (a *App) RefreshToken(refreshToken string) (interface{}, error) {
	return a.handler.RefreshToken(refreshToken)
}

func (a *App) Logout() error {
	return a.handler.Logout()
}

func (a *App) SetToken(token string) {
	a.handler.SetToken(token)
}

// User methods
func (a *App) GetCurrentUser() (interface{}, error) {
	return a.handler.GetCurrentUser()
}

func (a *App) GetUserByUUID(uuid string) (interface{}, error) {
	return a.handler.GetUserByUUID(uuid)
}

func (a *App) AddExperience(amount int) error {
	return a.handler.AddExperience(amount)
}

// Friend methods
func (a *App) GetFriends() (interface{}, error) {
	return a.handler.GetFriends()
}

func (a *App) SendFriendRequest(targetUUID string) (interface{}, error) {
	return a.handler.SendFriendRequest(targetUUID)
}

func (a *App) AcceptFriendRequest(friendID int64) error {
	return a.handler.AcceptFriendRequest(friendID)
}

func (a *App) RejectFriendRequest(friendID int64) error {
	return a.handler.RejectFriendRequest(friendID)
}

func (a *App) DeleteFriend(friendID int64) error {
	return a.handler.DeleteFriend(friendID)
}

// Ranking methods
func (a *App) GetTopRankings(rankType string, limit, season int) (interface{}, error) {
	return a.handler.GetTopRankings(rankType, limit, season)
}

func (a *App) GetMyRanking(rankType string, season int) (interface{}, error) {
	return a.handler.GetMyRanking(rankType, season)
}

// Team methods
func (a *App) CreateTeam(name, description string) (interface{}, error) {
	return a.handler.CreateTeam(name, description)
}

func (a *App) GetTeam(id int64) (interface{}, error) {
	return a.handler.GetTeam(id)
}

func (a *App) DisbandTeam(id int64) error {
	return a.handler.DisbandTeam(id)
}

func (a *App) GetTeamMembers(teamID int64) (interface{}, error) {
	return a.handler.GetTeamMembers(teamID)
}

func (a *App) AddTeamMember(teamID int64, userUUID string, role int) (interface{}, error) {
	return a.handler.AddTeamMember(teamID, userUUID, role)
}

func (a *App) UpdateMemberRole(teamID int64, userUUID string, role int) error {
	return a.handler.UpdateMemberRole(teamID, userUUID, role)
}

func (a *App) RemoveTeamMember(teamID int64, userUUID string) error {
	return a.handler.RemoveTeamMember(teamID, userUUID)
}

// Match methods
func (a *App) ReportMatchResult(report models.TeamReportInput) (interface{}, error) {
	return a.handler.ReportMatchResult(report)
}

func (a *App) GetMatch(id int64) (interface{}, error) {
	return a.handler.GetMatch(id)
}

func (a *App) GetMyMatches(pageNum, pageSize int) (interface{}, error) {
	return a.handler.GetMyMatches(pageNum, pageSize)
}
