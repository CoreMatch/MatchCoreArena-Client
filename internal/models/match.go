package models

import "time"

type Match struct {
	ID              int64     `json:"id"`
	MatchType       string    `json:"match_type"`
	WinnerTeamID    string    `json:"winner_team_id"`
	SurvivalRate    float64   `json:"survival_rate"`
	DurationSeconds int       `json:"duration_seconds"`
	StartedAt       time.Time `json:"started_at"`
	FinishedAt      time.Time `json:"finished_at"`
	CreatedAt       time.Time `json:"created_at"`
}

type TeamReportInput struct {
	MatchType       string           `json:"match_type"`
	WinnerTeam      TeamReportInfo   `json:"winner_team"`
	LoserTeams      []TeamReportInfo `json:"loser_teams"`
	DurationSeconds int              `json:"duration_seconds,omitempty"`
	StartedAt       time.Time        `json:"started_at"`
	FinishedAt      time.Time        `json:"finished_at"`
}

type TeamReportInfo struct {
	TeamID       string              `json:"team_id"`
	InitialCount int                 `json:"initial_count"`
	AliveCount   int                 `json:"alive_count"`
	Members      []ParticipantReport `json:"members"`
}

type ParticipantReport struct {
	UUID         string  `json:"uuid"`
	SurvivalTime int     `json:"survival_time"`
	Kills        int     `json:"kills"`
	Deaths       int     `json:"deaths"`
	PerfTweak    float64 `json:"perf_tweak"`
}
