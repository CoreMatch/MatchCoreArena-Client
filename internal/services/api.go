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
	if s.token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.token))
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

// Delete 仅用于玩家自己的排队操作（离开匹配队列）；对局数据写接口
// 不经过本客户端（见 knowledge 0010/0011）。
func (s *APIService) Delete(endpoint string) ([]byte, error) {
	return s.makeRequest("DELETE", endpoint, nil)
}
