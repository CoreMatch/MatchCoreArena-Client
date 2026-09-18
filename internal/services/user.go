package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"fmt"
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

	var userResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &userResp); err != nil {
		return nil, fmt.Errorf("failed to parse user response: %w", err)
	}

	dataBytes, err := json.Marshal(userResp.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal user data: %w", err)
	}

	var user models.User
	if err := json.Unmarshal(dataBytes, &user); err != nil {
		return nil, fmt.Errorf("failed to parse user data: %w", err)
	}

	return &user, nil
}

func (s *UserService) GetUserByUUID(uuid string) (*models.User, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/users/%s", uuid))
	if err != nil {
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	var userResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &userResp); err != nil {
		return nil, fmt.Errorf("failed to parse user response: %w", err)
	}

	dataBytes, err := json.Marshal(userResp.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal user data: %w", err)
	}

	var user models.User
	if err := json.Unmarshal(dataBytes, &user); err != nil {
		return nil, fmt.Errorf("failed to parse user data: %w", err)
	}

	return &user, nil
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
