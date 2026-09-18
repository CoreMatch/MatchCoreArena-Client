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

func (s *FriendService) SendFriendRequest(targetUUID string) (*models.Friend, error) {
	reqBody := struct {
		TargetUUID string `json:"target_uuid"`
	}{
		TargetUUID: targetUUID,
	}

	resp, err := s.api.Post("/api/friends", reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to send friend request: %w", err)
	}

	var friendResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &friendResp); err != nil {
		return nil, fmt.Errorf("failed to parse friend response: %w", err)
	}

	dataBytes, err := json.Marshal(friendResp.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal friend data: %w", err)
	}

	var friend models.Friend
	if err := json.Unmarshal(dataBytes, &friend); err != nil {
		return nil, fmt.Errorf("failed to parse friend data: %w", err)
	}

	return &friend, nil
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
