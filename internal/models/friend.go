package models

import "time"

// Friend 好友关系（服务端契约 Friend schema：uid 基，HA-Contract
// matchcorearena-business.yaml）。
type Friend struct {
	ID        int64     `json:"id"`
	UserUID   int64     `json:"user_uid"`
	FriendUID int64     `json:"friend_uid"`
	Status    int       `json:"status"` // 0=pending, 1=accepted, 2=rejected
	CreatedAt time.Time `json:"created_at"`
}
