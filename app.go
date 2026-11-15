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
	a.handler.StartInterop()
}

// shutdown is called when the app exits.
func (a *App) shutdown(ctx context.Context) {
	a.handler.StopInterop()
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

// GetRankingTiers is a read-only query of the display-only tier ladder
// (contract v1.7.0); an empty array means "no tiers configured".
func (a *App) GetRankingTiers() (interface{}, error) {
	return a.handler.GetRankingTiers()
}

// Match methods (read-only)
func (a *App) GetMatch(id int64) (interface{}, error) {
	return a.handler.GetMatch(id)
}

func (a *App) GetMyMatches(pageNum, pageSize int) (interface{}, error) {
	return a.handler.GetMyMatches(pageNum, pageSize)
}

// Matchmaking methods (the player's own queue operations)
func (a *App) JoinMatchmaking(matchType string, partyMembers []string) (interface{}, error) {
	return a.handler.JoinMatchmaking(matchType, partyMembers)
}

func (a *App) LeaveMatchmaking() error {
	return a.handler.LeaveMatchmaking()
}

func (a *App) GetMatchmakingStatus() (interface{}, error) {
	return a.handler.GetMatchmakingStatus()
}

// Party invite state machine (contract 1.11.0) — the consent gate that must
// precede party queueing: all non-caller members must accept an invite from
// the caller for the same match_type before they can be put into party_members
// for join. Invites only write matchmaking_party_invites rows, never scores.
func (a *App) InviteParty(matchType string, memberUUIDs []string) (interface{}, error) {
	return a.handler.InviteParty(matchType, memberUUIDs)
}

func (a *App) MyPartyInvites() (interface{}, error) {
	return a.handler.MyPartyInvites()
}

func (a *App) AcceptPartyInvite(id int64) (interface{}, error) {
	return a.handler.AcceptPartyInvite(id)
}

func (a *App) RejectPartyInvite(id int64) (interface{}, error) {
	return a.handler.RejectPartyInvite(id)
}

// Match handoff methods (INTEROP-SPEC v1 sender side; loopback-only,
// credential-free delivery of the settled match to SamuelClient)
func (a *App) PrepareHandoff(matchID int64, matchType, mapName, serverHost string, serverPort int) (interface{}, error) {
	return a.handler.PrepareHandoff(matchID, matchType, mapName, serverHost, serverPort)
}

func (a *App) GetHandoffStatus() (interface{}, error) {
	return a.handler.GetHandoffStatus()
}

// Local settings (game server address used by the match handoff and the
// manual-join display)
func (a *App) GetGameServerConfig() (interface{}, error) {
	return a.handler.GetGameServerConfig()
}

func (a *App) SetGameServerConfig(host string, port int) error {
	return a.handler.SetGameServerConfig(host, port)
}
