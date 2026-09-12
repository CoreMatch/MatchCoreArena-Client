package main
package services

import (
	"encoding/json"
	"fmt"
	"MatchCoreArena-Client/internal/models"
)

type UserService struct {
	api *APIService
}

func NewUserService(api *APIService) *UserService {
	return &UserService{api: api}
}

func (s *UserService) GetCurrentUser() (*models.User, error) {
	resp, err := s.api.Get("/api/users/me")
	if err != nil {
		return nil, fmt.Errorf("failed to get current user: %w", err)
	}
	
	var userResp struct {
		Success bool         `json:"success"`
		Data    models.User  `json:"data"`
	}
	if err := json.Unmarshal(resp, &userResp); err != nil {
		return nil, fmt.Errorf("failed to parse user response: %w", err)
	}
	
	return &userResp.Data, nil
}

func (s *UserService) GetUserByUID(uid int64) (*models.User, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/users/%d", uid))
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	
	var userResp struct {
		Success bool         `json:"success"`
		Data    models.User  `json:"data"`
	}
	if err := json.Unmarshal(resp, &userResp); err != nil {
		return nil, fmt.Errorf("failed to parse user response: %w", err)
	}
	
	return &userResp.Data, nil
}

func (s *UserService) AddExperience(amount int) error {
	reqBody := struct {
		Amount int `json:"amount"`
	}{
		Amount: amount,
	}
	
	_, err := s.api.Post("/api/users/me/experience", reqBody)
	if err != nil {
		return fmt.Errorf("failed to add experience: %w", err)
	}
	
	return nil
}