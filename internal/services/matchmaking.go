package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"fmt"
)

// MatchmakingService 访问服务端匹配端点（/api/matchmaking/*），
// 使用当前登录用户令牌。
type MatchmakingService struct {
	api *APIService
}

func NewMatchmakingService(api *APIService) *MatchmakingService {
	return &MatchmakingService{api: api}
}

// Join 加入匹配队列。
func (s *MatchmakingService) Join(matchType string) (*models.QueueEntry, error) {
	resp, err := s.api.Post("/api/matchmaking/join", map[string]string{"match_type": matchType})
	if err != nil {
		return nil, fmt.Errorf("failed to join matchmaking queue: %w", err)
	}

	var envelope models.SuccessEnvelope
	if err := json.Unmarshal(resp, &envelope); err != nil {
		return nil, fmt.Errorf("failed to parse join response: %w", err)
	}

	dataBytes, _ := json.Marshal(envelope.Data)
	var entry models.QueueEntry
	if err := json.Unmarshal(dataBytes, &entry); err != nil {
		return nil, fmt.Errorf("failed to parse queue entry: %w", err)
	}
	return &entry, nil
}

// Leave 离开匹配队列。
func (s *MatchmakingService) Leave() error {
	if _, err := s.api.Delete("/api/matchmaking/leave"); err != nil {
		return fmt.Errorf("failed to leave matchmaking queue: %w", err)
	}
	return nil
}

// Status 查询排队状态与近期成局记录。
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
