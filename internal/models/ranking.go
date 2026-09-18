package models

import "time"

type Ranking struct {
	ID           int64     `json:"id"`
	UserUUID     string    `json:"user_uuid"`
	RankType     string    `json:"rank_type"`
	Score        int64     `json:"score"`
	RankPosition int       `json:"rank_position"`
	Season       int       `json:"season"`
	UpdatedAt    time.Time `json:"updated_at"`
}
