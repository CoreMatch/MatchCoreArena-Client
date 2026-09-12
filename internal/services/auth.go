package main
package services

import (
	"encoding/json"
	"fmt"
)

type AuthService struct {
	api *APIService
}

func NewAuthService(api *APIService) *AuthService {
	return &AuthService{api: api}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
	Meta    interface{} `json:"meta"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

type TOTPRequest struct {
	LoginTicket string `json:"login_ticket"`
	Passcode    string `json:"passcode"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (s *AuthService) Login(email, password string) (*LoginResponse, error) {
	reqBody := LoginRequest{
		Email:    email,
		Password: password,
	}
	
	resp, err := s.api.Post("/api/auth/login-ticket", reqBody)
	if err != nil {
		return nil, fmt.Errorf("login failed: %w", err)
	}
	
	var loginResp LoginResponse
	if err := json.Unmarshal(resp, &loginResp); err != nil {
		return nil, fmt.Errorf("failed to parse login response: %w", err)
	}
	
	return &loginResp, nil
}

func (s *AuthService) VerifyTOTP(loginTicket, passcode string) (*TokenResponse, error) {
	reqBody := TOTPRequest{
		LoginTicket: loginTicket,
		Passcode:    passcode,
	}
	
	resp, err := s.api.Post("/api/auth/totp-verify", reqBody)
	if err != nil {
		return nil, fmt.Errorf("TOTP verification failed: %w", err)
	}
	
	var tokenResp struct {
		Success bool          `json:"success"`
		Data    TokenResponse `json:"data"`
	}
	if err := json.Unmarshal(resp, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse TOTP response: %w", err)
	}
	
	return &tokenResp.Data, nil
}

func (s *AuthService) RefreshToken(refreshToken string) (*TokenResponse, error) {
	reqBody := RefreshRequest{
		RefreshToken: refreshToken,
	}
	
	resp, err := s.api.Post("/api/auth/refresh", reqBody)
	if err != nil {
		return nil, fmt.Errorf("token refresh failed: %w", err)
	}
	
	var tokenResp struct {
		Success bool          `json:"success"`
		Data    TokenResponse `json:"data"`
	}
	if err := json.Unmarshal(resp, &tokenResp); err != nil {
		return nil, fmt.Errorf("failed to parse refresh response: %w", err)
	}
	
	return &tokenResp.Data, nil
}

func (s *AuthService) Logout() error {
	_, err := s.api.Post("/api/auth/logout", nil)
	if err != nil {
		return fmt.Errorf("logout failed: %w", err)
	}
	
	return nil
}