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

// GetMyRanking returns the player's ranking row, or (nil, nil) when the
// player simply has no ranking yet: the server answers an error envelope
// for a missing row (no typed not-found code exists), and that case is an
// empty state, not a failure. Transport problems still return an error.
func (s *RankingService) GetMyRanking(rankType string, season int) (*models.Ranking, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/rankings/me?type=%s&season=%d", rankType, season))
	if err != nil {
		if isServerErrorEnvelope(err) {
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

// isServerErrorEnvelope reports whether an APIService error carries a server
// error envelope body ({"success":false,...}), i.e. the server did respond
// and rejected the request, as opposed to a transport-level failure.
func isServerErrorEnvelope(err error) bool {
	return err != nil && strings.Contains(err.Error(), `"success":false`)
}
