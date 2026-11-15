package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"fmt"
)

type AuthService struct {
	api *APIService
}

func NewAuthService(api *APIService) *AuthService {
	return &AuthService{api: api}
}

func (s *AuthService) Login(email, password string) (*models.SuccessEnvelope, error) {
	reqBody := models.LoginRequest{
		Email:    email,
		Password: password,
	}

	resp, err := s.api.Post("/api/auth/login-ticket", reqBody)
	if err != nil {
		return nil, fmt.Errorf("login failed: %w", err)
	}

	var loginResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &loginResp); err != nil {
		return nil, fmt.Errorf("failed to parse login response: %w", err)
	}

	return &loginResp, nil
}

func (s *AuthService) VerifyTOTP(loginTicket, passcode string) (*models.TokenResponse, error) {
	reqBody := models.TOTPRequest{
		LoginTicket: loginTicket,
		Passcode:    passcode,
	}

	resp, err := s.api.Post("/api/auth/totp-verify", reqBody)
	if err != nil {
		return nil, fmt.Errorf("TOTP verification failed: %w", err)
	}

	var tokenResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse TOTP response: %w", err)
	}

	dataBytes, _ := json.Marshal(tokenResp.Data)
	var token models.TokenResponse
	json.Unmarshal(dataBytes, &token)

	return &token, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (*models.TokenResponse, error) {
	reqBody := models.RefreshRequest{
		RefreshToken: refreshToken,
	}

	resp, err := s.api.Post("/api/auth/refresh", reqBody)
	if err != nil {
		return nil, fmt.Errorf("token refresh failed: %w", err)
	}

	var tokenResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse refresh response: %w", err)
	}

	dataBytes, _ := json.Marshal(tokenResp.Data)
	var token models.TokenResponse
	json.Unmarshal(dataBytes, &token)

	return &token, nil
}

func (s *AuthService) Logout() error {
	_, err := s.api.Post("/api/auth/logout", nil)
	if err != nil {
		return fmt.Errorf("logout failed: %w", err)
	}

	return nil
}
