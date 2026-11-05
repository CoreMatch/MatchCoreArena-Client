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

// VirtualTeamInput 虚拟对局中的一支队伍（result: win/lose/draw）。
type VirtualTeamInput struct {
	TeamID       string              `json:"team_id"`
	Result       string              `json:"result"`
	InitialCount int                 `json:"initial_count"`
	AliveCount   int                 `json:"alive_count"`
	Members      []ParticipantReport `json:"members"`
}

// VirtualReportInput 虚拟对局提交参数（POST /api/matches/virtual）。
type VirtualReportInput struct {
	MatchType       string             `json:"match_type"`
	Teams           []VirtualTeamInput `json:"teams"`
	DurationSeconds int                `json:"duration_seconds,omitempty"`
	MapName         string             `json:"map_name,omitempty"`
	StartedAt       string             `json:"started_at,omitempty"`
	FinishedAt      string             `json:"finished_at,omitempty"`
}

// ParticipantSettlement 虚拟对局结算后单个参与者的评分变化。
type ParticipantSettlement struct {
	UID             int64  `json:"uid"`
	UUID            string `json:"uuid"`
	TeamID          string `json:"team_id"`
	Result          string `json:"result"`
	RankScoreBefore int    `json:"rank_score_before"`
	RankScoreDelta  int    `json:"rank_score_delta"`
	RankScoreAfter  int    `json:"rank_score_after"`
}

// VirtualMatchResult 虚拟对局结算结果。
type VirtualMatchResult struct {
	Match        Match                   `json:"match"`
	Participants []ParticipantSettlement `json:"participants"`
}

// QueueEntry 匹配队列条目。
type QueueEntry struct {
	UID        int64  `json:"uid"`
	MatchType  string `json:"match_type"`
	RankScore  int    `json:"rank_score"`
	EnqueuedAt string `json:"enqueued_at"`
}

// GroupMember 成局成员。
type GroupMember struct {
	UID       int64  `json:"uid"`
	TeamID    string `json:"team_id"`
	RankScore int    `json:"rank_score"`
}

// FormedGroup 匹配成局记录。
type FormedGroup struct {
	GroupID   int64         `json:"group_id"`
	MatchType string        `json:"match_type"`
	FormedAt  string        `json:"formed_at"`
	Members   []GroupMember `json:"members"`
}

// MatchmakingStatus 用户当前匹配状态。
type MatchmakingStatus struct {
	InQueue      bool          `json:"in_queue"`
	QueueEntry   *QueueEntry   `json:"queue_entry,omitempty"`
	RecentGroups []FormedGroup `json:"recent_groups"`
}
