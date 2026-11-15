package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"fmt"
)

// FriendService 仅提供只读好友列表查询；好友请求的发送与处理
// 不在只读客户端范围内。
type FriendService struct {
	api *APIService
}

func NewFriendService(api *APIService) *FriendService {
	return &FriendService{api: api}
}

func (s *FriendService) GetFriends() ([]models.Friend, error) {
	resp, err := s.api.Get("/api/friends")
	if err != nil {
		return nil, fmt.Errorf("failed to get friends: %w", err)
	}

	var friendsResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &friendsResp); err != nil {
		return nil, fmt.Errorf("failed to parse friends response: %w", err)
	}

	dataBytes, err := json.Marshal(friendsResp.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal friends data: %w", err)
	}

	var friends []models.Friend
	if err := json.Unmarshal(dataBytes, &friends); err != nil {
		return nil, fmt.Errorf("failed to parse friends data: %w", err)
	}

	return friends, nil
}
