package models

import "time"

type Team struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description,omitempty"`
	LeaderUUID  string    `json:"leader_uuid"`
	CreatedAt   time.Time `json:"created_at"`
}

type TeamMember struct {
	ID       int64     `json:"id"`
	TeamID   int64     `json:"team_id"`
	UserUUID string    `json:"user_uuid"`
	Role     int       `json:"role"` // 0=member, 1=vice-leader, 2=leader
	JoinedAt time.Time `json:"joined_at"`
}
