package main
package services

import (
	"encoding/json"
	"fmt"
	"MatchCoreArena-Client/internal/models"
)

type RankingService struct {
	api *APIService
}

func NewRankingService(api *APIService) *RankingService {
	return &RankingService{api: api}
}

func (s *RankingService) GetTopRankings(rankType string, limit, season int) ([]models.Ranking, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/rankings/%s?limit=%d&season=%d", rankType, limit, season))
	if err != nil {
		return nil, fmt.Errorf("failed to get rankings: %w", err)
	}
	
	var rankingsResp struct {
		Success bool              `json:"success"`
		Data    []models.Ranking  `json:"data"`
	}
	if err := json.Unmarshal(resp, &rankingsResp); err != nil {
		return nil, fmt.Errorf("failed to parse rankings response: %w", err)
	}
	
	return rankingsResp.Data, nil
}

func (s *RankingService) GetMyRanking(rankType string, season int) (*models.Ranking, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/rankings/me?type=%s&season=%d", rankType, season))
	if err != nil {
		return nil, fmt.Errorf("failed to get my ranking: %w", err)
	}
	
	var rankingResp struct {
		Success bool            `json:"success"`
		Data    models.Ranking  `json:"data"`
	}
	if err := json.Unmarshal(resp, &rankingResp); err != nil {
		return nil, fmt.Errorf("failed to parse ranking response: %w", err)
	}
	
	return &rankingResp.Data, nil
}