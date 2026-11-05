package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type APIService struct {
	baseURL    string
	httpClient *http.Client
	token      string
}

func NewAPIService(baseURL string) *APIService {
	return &APIService{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (s *APIService) SetToken(token string) {
	s.token = token
}

func (s *APIService) makeRequest(method, endpoint string, body interface{}) ([]byte, error) {
	return s.makeRequestWithToken(method, endpoint, body, s.token)
}

// makeRequestWithToken 与 makeRequest 相同，但使用显式令牌（为空时不带
// Authorization 头）。用于需要非当前登录用户凭据的端点（如虚拟对局
// 上报需要 match:report 服务令牌）。
func (s *APIService) makeRequestWithToken(method, endpoint string, body interface{}, token string) ([]byte, error) {
	url := fmt.Sprintf("%s%s", s.baseURL, endpoint)

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	return respBody, nil
}

func (s *APIService) Get(endpoint string) ([]byte, error) {
	return s.makeRequest("GET", endpoint, nil)
}

func (s *APIService) Post(endpoint string, body interface{}) ([]byte, error) {
	return s.makeRequest("POST", endpoint, body)
}

// PostWithToken 使用显式令牌发起 POST；token 为空时回落到会话令牌。
func (s *APIService) PostWithToken(endpoint string, body interface{}, token string) ([]byte, error) {
	if token == "" {
		token = s.token
	}
	return s.makeRequestWithToken("POST", endpoint, body, token)
}

func (s *APIService) Put(endpoint string, body interface{}) ([]byte, error) {
	return s.makeRequest("PUT", endpoint, body)
}

func (s *APIService) Delete(endpoint string) ([]byte, error) {
	return s.makeRequest("DELETE", endpoint, nil)
}
