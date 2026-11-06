package main

import (
	"MatchCoreArena-Client/internal/handlers"
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

// Friend methods
func (a *App) GetFriends() (interface{}, error) {
	return a.handler.GetFriends()
}

// Ranking methods
func (a *App) GetTopRankings(rankType string, limit, season int) (interface{}, error) {
	return a.handler.GetTopRankings(rankType, limit, season)
}

func (a *App) GetMyRanking(rankType string, season int) (interface{}, error) {
	return a.handler.GetMyRanking(rankType, season)
}

// Match methods (read-only)
func (a *App) GetMatch(id int64) (interface{}, error) {
	return a.handler.GetMatch(id)
}

func (a *App) GetMyMatches(pageNum, pageSize int) (interface{}, error) {
	return a.handler.GetMyMatches(pageNum, pageSize)
}
