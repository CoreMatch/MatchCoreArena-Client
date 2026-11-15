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

// RankTier 段位阶梯展示项（契约 v1.7.0，纯展示配置；服务端未配置时
// GET /api/rankings/tiers 返回空数组，客户端不得自行硬编码阈值）。
type RankTier struct {
	Name     string `json:"name"`
	MinScore int    `json:"min_score"`
}
