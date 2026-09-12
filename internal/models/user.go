package models

import "time"

type User struct {
	UID        int64     `json:"uid"`
	Level      int       `json:"level"`
	Experience int64     `json:"experience"`
	RankScore  int       `json:"rank_score"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
