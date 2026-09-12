package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"fmt"
)

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

	var friendsResp struct {
		Success bool            `json:"success"`
		Data    []models.Friend `json:"data"`
	}
	if err := json.Unmarshal(resp, &friendsResp); err != nil {
		return nil, fmt.Errorf("failed to parse friends response: %w", err)
	}

	return friendsResp.Data, nil
}

func (s *FriendService) SendFriendRequest(targetUID int64) (*models.Friend, error) {
	reqBody := struct {
		TargetUID int64 `json:"target_uid"`
	}{
		TargetUID: targetUID,
	}

	resp, err := s.api.Post("/api/friends", reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to send friend request: %w", err)
	}

	var friendResp struct {
		Success bool          `json:"success"`
		Data    models.Friend `json:"data"`
	}
	if err := json.Unmarshal(resp, &friendResp); err != nil {
		return nil, fmt.Errorf("failed to parse friend response: %w", err)
	}

	return &friendResp.Data, nil
}

func (s *FriendService) AcceptFriendRequest(friendID int64) error {
	_, err := s.api.Put(fmt.Sprintf("/api/friends/%d/accept", friendID), nil)
	if err != nil {
		return fmt.Errorf("failed to accept friend request: %w", err)
	}

	return nil
}

func (s *FriendService) RejectFriendRequest(friendID int64) error {
	_, err := s.api.Put(fmt.Sprintf("/api/friends/%d/reject", friendID), nil)
	if err != nil {
		return fmt.Errorf("failed to reject friend request: %w", err)
	}

	return nil
}

func (s *FriendService) DeleteFriend(friendID int64) error {
	_, err := s.api.Delete(fmt.Sprintf("/api/friends/%d", friendID))
	if err != nil {
		return fmt.Errorf("failed to delete friend: %w", err)
	}

	return nil
}
