package models

import "time"

type Match struct {
	ID              int64     `json:"id"`
	MatchType       string    `json:"match_type"`
	Source          string    `json:"source"`
	MapName         string    `json:"map_name"`
	WinnerTeamID    string    `json:"winner_team_id"`
	SurvivalRate    float64   `json:"survival_rate"`
	DurationSeconds int       `json:"duration_seconds"`
	StartedAt       time.Time `json:"started_at"`
	FinishedAt      time.Time `json:"finished_at"`
	CreatedAt       time.Time `json:"created_at"`

	// Participants 仅 GET /api/matches/{id} 返回。
	Participants []ParticipantDetail `json:"participants,omitempty"`
}

// ParticipantDetail 对战参与者明细（含本局评分变动）。
type ParticipantDetail struct {
	UID             int64  `json:"uid"`
	TeamID          string `json:"team_id"`
	IsWinner        bool   `json:"is_winner"`
	IsDraw          bool   `json:"is_draw"`
	RankScoreBefore int    `json:"rank_score_before"`
	RankScoreDelta  int    `json:"rank_score_delta"`
	SurvivalTime    int    `json:"survival_time"`
	Kills           int    `json:"kills"`
	Deaths          int    `json:"deaths"`
}
