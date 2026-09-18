package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"fmt"
)

type TeamService struct {
	api *APIService
}

func NewTeamService(api *APIService) *TeamService {
	return &TeamService{api: api}
}

func (s *TeamService) CreateTeam(name, description string) (*models.Team, error) {
	reqBody := struct {
		Name        string `json:"name"`
		Description string `json:"description,omitempty"`
	}{
		Name:        name,
		Description: description,
	}

	resp, err := s.api.Post("/api/teams", reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to create team: %w", err)
	}

	var teamResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &teamResp); err != nil {
		return nil, fmt.Errorf("failed to parse team response: %w", err)
	}

	dataBytes, _ := json.Marshal(teamResp.Data)
	var team models.Team
	json.Unmarshal(dataBytes, &team)

	return &team, nil
}

func (s *TeamService) GetTeam(id int64) (*models.Team, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/teams/%d", id))
	if err != nil {
		return nil, fmt.Errorf("failed to get team: %w", err)
	}

	var teamResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &teamResp); err != nil {
		return nil, fmt.Errorf("failed to parse team response: %w", err)
	}

	dataBytes, _ := json.Marshal(teamResp.Data)
	var team models.Team
	json.Unmarshal(dataBytes, &team)

	return &team, nil
}

func (s *TeamService) DisbandTeam(id int64) error {
	_, err := s.api.Delete(fmt.Sprintf("/api/teams/%d", id))
	if err != nil {
		return fmt.Errorf("failed to disband team: %w", err)
	}
	return nil
}

func (s *TeamService) GetTeamMembers(teamID int64) ([]models.TeamMember, error) {
	resp, err := s.api.Get(fmt.Sprintf("/api/teams/%d/members", teamID))
	if err != nil {
		return nil, fmt.Errorf("failed to get team members: %w", err)
	}

	var membersResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &membersResp); err != nil {
		return nil, fmt.Errorf("failed to parse team members response: %w", err)
	}

	dataBytes, _ := json.Marshal(membersResp.Data)
	var members []models.TeamMember
	json.Unmarshal(dataBytes, &members)

	return members, nil
}

func (s *TeamService) AddTeamMember(teamID int64, userUUID string, role int) (*models.TeamMember, error) {
	reqBody := struct {
		UserUUID string `json:"user_uuid"`
		Role     int    `json:"role"`
	}{
		UserUUID: userUUID,
		Role:     role,
	}

	resp, err := s.api.Post(fmt.Sprintf("/api/teams/%d/members", teamID), reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to add team member: %w", err)
	}

	var memberResp models.SuccessEnvelope
	if err := json.Unmarshal(resp, &memberResp); err != nil {
		return nil, fmt.Errorf("failed to parse member response: %w", err)
	}

	dataBytes, _ := json.Marshal(memberResp.Data)
	var member models.TeamMember
	json.Unmarshal(dataBytes, &member)

	return &member, nil
}

func (s *TeamService) UpdateMemberRole(teamID int64, userUUID string, role int) error {
	reqBody := struct {
		Role int `json:"role"`
	}{
		Role: role,
	}

	_, err := s.api.Put(fmt.Sprintf("/api/teams/%d/members/%s/role", teamID, userUUID), reqBody)
	if err != nil {
		return fmt.Errorf("failed to update member role: %w", err)
	}
	return nil
}

func (s *TeamService) RemoveTeamMember(teamID int64, userUUID string) error {
	_, err := s.api.Delete(fmt.Sprintf("/api/teams/%d/members/%s", teamID, userUUID))
	if err != nil {
		return fmt.Errorf("failed to remove team member: %w", err)
	}
	return nil
}
