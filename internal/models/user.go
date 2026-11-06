package models

import "time"

// User 与服务端 users 表口径一致：身份为数值 uid（服务端
// GET /api/users/:uid 按 int64 解析），不存在字符串 UUID 字段。
type User struct {
	UID        int64     `json:"uid"`
	Level      int       `json:"level"`
	Experience int64     `json:"experience"`
	RankScore  int       `json:"rank_score"`
	WinsCount  int64     `json:"wins_count"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
