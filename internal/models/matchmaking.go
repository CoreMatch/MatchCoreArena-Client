package models

// QueueEntry 匹配队列条目（服务端契约 v1.6.0 QueueEntry）。
type QueueEntry struct {
	UID        int64  `json:"uid"`
	MatchType  string `json:"match_type"`
	RankScore  int    `json:"rank_score"`
	PartyID    int64  `json:"party_id,omitempty"`
	EnqueuedAt string `json:"enqueued_at"`
}

// GroupMember 成局成员（服务端契约 v1.6.0 GroupMember）。
type GroupMember struct {
	UID       int64  `json:"uid"`
	TeamID    string `json:"team_id"`
	RankScore int    `json:"rank_score"`
	PartyID   int64  `json:"party_id,omitempty"`
}

// GroupJoinTarget 成局下发的游戏服务器地址（契约 v1.6.0；服务端未配置
// 时整个字段省略）。
type GroupJoinTarget struct {
	Host string `json:"host"`
	Port int    `json:"port"`
}

// FormedGroup 匹配成局记录（服务端契约 v1.6.0 FormedGroup）。
type FormedGroup struct {
	GroupID    int64            `json:"group_id"`
	MatchType  string           `json:"match_type"`
	FormedAt   string           `json:"formed_at"`
	Members    []GroupMember    `json:"members"`
	JoinTarget *GroupJoinTarget `json:"join_target,omitempty"`
}

// MatchmakingStatus 用户当前匹配状态（服务端契约 v1.6.0 MatchmakingStatus）。
type MatchmakingStatus struct {
	InQueue      bool          `json:"in_queue"`
	QueueEntry   *QueueEntry   `json:"queue_entry,omitempty"`
	RecentGroups []FormedGroup `json:"recent_groups"`
}
