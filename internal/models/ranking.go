package models

// Ranking 排行榜条目。身份字段为服务端口径的数值 user_uid。
type Ranking struct {
	ID           int64  `json:"id"`
	UserUID      int64  `json:"user_uid"`
	RankType     string `json:"rank_type"`
	Score        int64  `json:"score"`
	RankPosition int    `json:"rank_position"`
	Season       int    `json:"season"`
	UpdatedAt    string `json:"updated_at"`
}
