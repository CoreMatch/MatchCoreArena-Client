package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"fmt"
)

// MatchmakingService 访问服务端匹配端点（/api/matchmaking/*），
// 使用当前登录用户令牌。队列加入/离开是玩家自己的排队操作；
// 对局上报与任何写战绩接口不属于客户端（见 knowledge 0010/0011）。
type MatchmakingService struct {
	api *APIService
}

func NewMatchmakingService(api *APIService) *MatchmakingService {
	return &MatchmakingService{api: api}
}

// Join 加入匹配队列。partyMembers 为空时单人入队；非空时按队整体入队
// （字段名 party_members 与服务端/运维台一致，成员为 UUID 列表）。
// 返回本次入队的全部队列条目（单人 1 条，队伍整队多条）。
func (s *MatchmakingService) Join(matchType string, partyMembers []string) ([]models.QueueEntry, error) {
	body := map[string]interface{}{"match_type": matchType}
	if len(partyMembers) > 0 {
		body["party_members"] = partyMembers
	}

	resp, err := s.api.Post("/api/matchmaking/join", body)
	if err != nil {
		return nil, fmt.Errorf("failed to join matchmaking queue: %w", err)
	}

	var envelope models.SuccessEnvelope
	if err := json.Unmarshal(resp, &envelope); err != nil {
		return nil, fmt.Errorf("failed to parse join response: %w", err)
	}

	dataBytes, _ := json.Marshal(envelope.Data)
	var entries []models.QueueEntry
	if err := json.Unmarshal(dataBytes, &entries); err != nil {
		return nil, fmt.Errorf("failed to parse queue entries: %w", err)
	}
	return entries, nil
}

// Leave 离开匹配队列。
func (s *MatchmakingService) Leave() error {
	if _, err := s.api.Delete("/api/matchmaking/leave"); err != nil {
		return fmt.Errorf("failed to leave matchmaking queue: %w", err)
	}
	return nil
}

// Status 查询排队状态与本人相关的近期成局记录。
func (s *MatchmakingService) Status() (*models.MatchmakingStatus, error) {
	resp, err := s.api.Get("/api/matchmaking/status")
	if err != nil {
		return nil, fmt.Errorf("failed to get matchmaking status: %w", err)
	}

	var envelope models.SuccessEnvelope
	if err := json.Unmarshal(resp, &envelope); err != nil {
		return nil, fmt.Errorf("failed to parse status response: %w", err)
	}

	dataBytes, _ := json.Marshal(envelope.Data)
	var status models.MatchmakingStatus
	if err := json.Unmarshal(dataBytes, &status); err != nil {
		return nil, fmt.Errorf("failed to parse matchmaking status: %w", err)
	}
	return &status, nil
}
