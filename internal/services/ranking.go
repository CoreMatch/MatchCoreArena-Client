package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"fmt"
	"strings"
)

type RankingService struct {
	api *APIService
}

func NewRankingService(api *APIService) *RankingService {
	return &RankingService{api: api}
}

// TopRankingsResponse mirrors the server's data payload for
// GET /api/rankings/{type}: {"rankings": [...], "total_count": N}.
type TopRankingsResponse struct {
	Rankings   []models.Ranking `json:"rankings"`
	TotalCount int              `json:"total_count"`
}

func (s *RankingService) GetTopRankings(rankType string, limit, season int) (*TopRankingsResponse, error) {
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

	var top TopRankingsResponse
	if err := json.Unmarshal(dataBytes, &top); err == nil && top.Rankings != nil {
		return &top, nil
	}

	// Tolerate the legacy flat-array payload for older servers:
	// {"data": [...]} instead of {"data": {"rankings":[...], "total_count": N}}.
	var legacy []models.Ranking
	if legacyErr := json.Unmarshal(dataBytes, &legacy); legacyErr != nil {
		return nil, fmt.Errorf("failed to parse rankings data: %w", err)
	}
	top.Rankings = legacy
	top.TotalCount = len(legacy)
	return &top, nil
}

// GetMyRanking returns the player's ranking row, or (nil, nil) when the
// player simply has no ranking yet: the server answers a typed 404
// mca_ranking_not_found for a missing row, and that case is an empty
// state, not a failure. Any other server error envelope or transport
// problem still returns an error so the client can surface it.
func (s *RankingService) GetMyRanking(rankType string, season int) (*models.Ranking, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/rankings/me?type=%s&season=%d", rankType, season))
	if err != nil {
		if isRankingNotFound(err) {
			return nil, nil
		}
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

// GetRankingTiers returns the display-only rank-tier ladder (contract
// v1.7.0). An empty slice is a valid answer: the server has no tiers
// configured and the UI must not draw a progress bar (and must never
// hard-code thresholds itself).
func (s *RankingService) GetRankingTiers() ([]models.RankTier, error) {
	resp, err := s.api.Get("/api/rankings/tiers")
	if err != nil {
		return nil, fmt.Errorf("failed to get ranking tiers: %w", err)
	}

	var tiersResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &tiersResp); err != nil {
		return nil, fmt.Errorf("failed to parse tiers response: %w", err)
	}

	if tiersResp.Data == nil {
		return []models.RankTier{}, nil
	}
	dataBytes, err := json.Marshal(tiersResp.Data)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal tiers data: %w", err)
	}

	var tiers []models.RankTier
	if err := json.Unmarshal(dataBytes, &tiers); err != nil {
		return nil, fmt.Errorf("failed to parse tiers data: %w", err)
	}
	return tiers, nil
}

// isRankingNotFound reports whether an APIService error is the server's
// typed 404 mca_ranking_not_found — an unranked empty state, not a fault.
func isRankingNotFound(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "404") && strings.Contains(msg, "mca_ranking_not_found")
}
