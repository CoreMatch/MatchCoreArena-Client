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

// FormedGroup 匹配成局记录（服务端契约 v1.6.0 FormedGroup；Room 为
// v1.10.0 房间层字段）。
type FormedGroup struct {
	GroupID    int64            `json:"group_id"`
	MatchType  string           `json:"match_type"`
	FormedAt   string           `json:"formed_at"`
	Members    []GroupMember    `json:"members"`
	JoinTarget *GroupJoinTarget `json:"join_target,omitempty"`
	// Room 房间层（契约 v1.10.0）下为该成局预占的房间名（目标子服命名
	// 空间下的 arena/游戏名）；无房间层或预占失效时省略。
	Room string `json:"room,omitempty"`
}

// QueueStats 全局队列繁忙度（契约 v1.7.0，纯展示；跨模式全局口径，
// 不影响状态机）。
type QueueStats struct {
	Players            int64 `json:"players"`
	Parties            int64 `json:"parties"`
	AverageWaitSeconds int64 `json:"average_wait_seconds"`
}

// MatchmakingStatus 用户当前匹配状态（服务端契约 v1.7.0 MatchmakingStatus）。
type MatchmakingStatus struct {
	InQueue      bool          `json:"in_queue"`
	QueueEntry   *QueueEntry   `json:"queue_entry,omitempty"`
	RecentGroups []FormedGroup `json:"recent_groups"`
	QueueStats   QueueStats    `json:"queue_stats"`
}

// PartyInvite 组队邀请（契约 1.11.0 PartyInvite）。
// expired 为读取时的有效态（pending 且已过 expires_at），不落库。
type PartyInvite struct {
	ID         int64  `json:"id"`
	InviterUID int64  `json:"inviter_uid"`
	InviteeUID int64  `json:"invitee_uid"`
	MatchType  string `json:"match_type"`
	// status: pending / accepted / rejected / expired（expired 为客户端惰性判定态）
	Status     string `json:"status"`
	CreatedAt  string `json:"created_at"`
	ExpiresAt  string `json:"expires_at"`
	ResolvedAt string `json:"resolved_at,omitempty"`
	ConsumedAt string `json:"consumed_at,omitempty"`
}
