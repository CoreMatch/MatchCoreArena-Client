package main
package models

import "time"

type Ranking struct {
	ID           int64     `json:"id"`
	UserUID      int64     `json:"user_uid"`
	RankType     string    `json:"rank_type"`
	Score        int64     `json:"score"`
	RankPosition int       `json:"rank_position"`
	Season       int       `json:"season"`
	UpdatedAt    time.Time `json:"updated_at"`
}