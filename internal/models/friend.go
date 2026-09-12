package models

import "time"

type Friend struct {
	ID        int64     `json:"id"`
	UserUID   int64     `json:"user_uid"`
	FriendUID int64     `json:"friend_uid"`
	Status    int       `json:"status"` // 0=pending, 1=accepted, 2=rejected
	CreatedAt time.Time `json:"created_at"`
}
