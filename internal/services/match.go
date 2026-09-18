package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"fmt"
)

type MatchService struct {
	api *APIService
}

func NewMatchService(api *APIService) *MatchService {
	return &MatchService{api: api}
}

func (s *MatchService) ReportMatchResult(report models.TeamReportInput) (*models.Match, error) {
	resp, err := s.api.Post("/api/matches", report)
	if err != nil {
		return nil, fmt.Errorf("failed to report match result: %w", err)
	}

	var matchResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &matchResp); err != nil {
		return nil, fmt.Errorf("failed to parse match response: %w", err)
	}

	dataBytes, _ := json.Marshal(matchResp.Data)
	var match models.Match
	json.Unmarshal(dataBytes, &match)

	return &match, nil
}

func (s *MatchService) GetMatch(id int64) (*models.Match, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/matches/%d", id))
	if err != nil {
		return nil, fmt.Errorf("failed to get match: %w", err)
	}

	var matchResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &matchResp); err != nil {
		return nil, fmt.Errorf("failed to parse match response: %w", err)
	}

	dataBytes, _ := json.Marshal(matchResp.Data)
	var match models.Match
	json.Unmarshal(dataBytes, &match)

	return &match, nil
}

func (s *MatchService) GetMyMatches(pageNum, pageSize int) ([]models.Match, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/matches/me?page_num=%d&page_size=%d", pageNum, pageSize))
	if err != nil {
		return nil, fmt.Errorf("failed to get my matches: %w", err)
	}

	var matchesResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &matchesResp); err != nil {
		return nil, fmt.Errorf("failed to parse matches response: %w", err)
	}

	dataBytes, _ := json.Marshal(matchesResp.Data)
	var matches []models.Match
	json.Unmarshal(dataBytes, &matches)

	return matches, nil
}
