package models

import "time"

type Friend struct {
	ID         int64     `json:"id"`
	UserUUID   string    `json:"user_uuid"`
	FriendUUID string    `json:"friend_uuid"`
	Status     int       `json:"status"` // 0=pending, 1=accepted, 2=rejected
	CreatedAt  time.Time `json:"created_at"`
}
