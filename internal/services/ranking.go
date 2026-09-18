package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"fmt"
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

	var rankingsResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &rankingsResp); err != nil {
		return nil, fmt.Errorf("failed to parse rankings response: %w", err)
	}

	dataBytes, err := json.Marshal(rankingsResp.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal rankings data: %w", err)
	}

	var rankings []models.Ranking
	if err := json.Unmarshal(dataBytes, &rankings); err != nil {
		return nil, fmt.Errorf("failed to parse rankings data: %w", err)
	}

	return rankings, nil
}

func (s *RankingService) GetMyRanking(rankType string, season int) (*models.Ranking, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/rankings/me?type=%s&season=%d", rankType, season))
	if err != nil {
		return nil, fmt.Errorf("failed to get my ranking: %w", err)
	}

	var rankingResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &rankingResp); err != nil {
		return nil, fmt.Errorf("failed to parse ranking response: %w", err)
	}

	dataBytes, err := json.Marshal(rankingResp.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal ranking data: %w", err)
	}

	var ranking models.Ranking
	if err := json.Unmarshal(dataBytes, &ranking); err != nil {
		return nil, fmt.Errorf("failed to parse ranking data: %w", err)
	}

	return &ranking, nil
}
