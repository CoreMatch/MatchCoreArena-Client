package services

import (
	"MatchCoreArena-Client/internal/models"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// envelope 构造服务端成功响应体。
func envelope(t *testing.T, data any) []byte {
	t.Helper()
	body, err := json.Marshal(models.SuccessEnvelope{Success: true, Message: "ok", Data: data})
	if err != nil {
		t.Fatalf("failed to marshal envelope: %v", err)
	}
	return body
}

func TestAPIServiceSendsBearerToken(t *testing.T) {
	var gotAuth string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		w.Write(envelope(t, nil))
	}))
	defer server.Close()

	api := NewAPIService(server.URL)
	api.SetToken("test-token")
	if _, err := api.Get("/api/users/me"); err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	if gotAuth != "Bearer test-token" {
		t.Fatalf("expected Bearer test-token, got %q", gotAuth)
	}
}

func TestAPIServiceErrorStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"success":false,"message":"unauthorized"}`))
	}))
	defer server.Close()

	api := NewAPIService(server.URL)
	if _, err := api.Get("/api/users/me"); err == nil {
		t.Fatal("expected error for 401 response, got nil")
	}
}

func TestMatchServiceGetMyMatches(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/matches/me" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		if r.URL.Query().Get("page_num") != "1" || r.URL.Query().Get("page_size") != "20" {
			t.Errorf("unexpected query %s", r.URL.RawQuery)
		}
		w.Write(envelope(t, []models.Match{{ID: 7, MatchType: "1v1", Source: "virtual"}}))
	}))
	defer server.Close()

	svc := NewMatchService(NewAPIService(server.URL))
	matches, err := svc.GetMyMatches(1, 20)
	if err != nil {
		t.Fatalf("GetMyMatches failed: %v", err)
	}
	if len(matches) != 1 || matches[0].ID != 7 || matches[0].MatchType != "1v1" {
		t.Fatalf("unexpected matches: %+v", matches)
	}
}

func TestMatchServiceGetMatch(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/matches/42" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		w.Write(envelope(t, models.Match{
			ID:           42,
			WinnerTeamID: "A",
			Participants: []models.ParticipantDetail{{UID: 1, TeamID: "A", IsWinner: true, RankScoreBefore: 1000, RankScoreDelta: 12}},
		}))
	}))
	defer server.Close()

	svc := NewMatchService(NewAPIService(server.URL))
	match, err := svc.GetMatch(42)
	if err != nil {
		t.Fatalf("GetMatch failed: %v", err)
	}
	if match.ID != 42 || len(match.Participants) != 1 || match.Participants[0].RankScoreDelta != 12 {
		t.Fatalf("unexpected match: %+v", match)
	}
}

func TestRankingServiceGetTopRankings(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/rankings/1v1" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		if r.URL.Query().Get("limit") != "50" || r.URL.Query().Get("season") != "2" {
			t.Errorf("unexpected query %s", r.URL.RawQuery)
		}
		w.Write(envelope(t, []models.Ranking{{ID: 1, UserUID: 9, Score: 1500, RankPosition: 1, Season: 2}}))
	}))
	defer server.Close()

	svc := NewRankingService(NewAPIService(server.URL))
	rankings, err := svc.GetTopRankings("1v1", 50, 2)
	if err != nil {
		t.Fatalf("GetTopRankings failed: %v", err)
	}
	if len(rankings) != 1 || rankings[0].Score != 1500 || rankings[0].RankPosition != 1 {
		t.Fatalf("unexpected rankings: %+v", rankings)
	}
}

func TestRankingServiceGetMyRanking(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/rankings/me" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		w.Write(envelope(t, models.Ranking{UserUID: 42, RankPosition: 3, Score: 1200}))
	}))
	defer server.Close()

	svc := NewRankingService(NewAPIService(server.URL))
	ranking, err := svc.GetMyRanking("2v2", 1)
	if err != nil {
		t.Fatalf("GetMyRanking failed: %v", err)
	}
	if ranking.RankPosition != 3 || ranking.Score != 1200 {
		t.Fatalf("unexpected ranking: %+v", ranking)
	}
}

func TestFriendServiceGetFriends(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/friends" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		w.Write(envelope(t, []models.Friend{{ID: 1, FriendUUID: "f1", Status: 1}}))
	}))
	defer server.Close()

	svc := NewFriendService(NewAPIService(server.URL))
	friends, err := svc.GetFriends()
	if err != nil {
		t.Fatalf("GetFriends failed: %v", err)
	}
	if len(friends) != 1 || friends[0].FriendUUID != "f1" || friends[0].Status != 1 {
		t.Fatalf("unexpected friends: %+v", friends)
	}
}

func TestUserServiceGetCurrentUser(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/users/me" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		w.Write(envelope(t, models.User{UID: 7, Level: 5, Experience: 320, RankScore: 1100, WinsCount: 3}))
	}))
	defer server.Close()

	svc := NewUserService(NewAPIService(server.URL))
	user, err := svc.GetCurrentUser()
	if err != nil {
		t.Fatalf("GetCurrentUser failed: %v", err)
	}
	if user.UID != 7 || user.Level != 5 || user.RankScore != 1100 || user.WinsCount != 3 {
		t.Fatalf("unexpected user: %+v", user)
	}
}

func TestAuthServiceLogin(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/auth/login-ticket" || r.Method != http.MethodPost {
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		var req models.LoginRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Errorf("failed to decode login request: %v", err)
		}
		if req.Email != "a@b.c" || req.Password != "pw" {
			t.Errorf("unexpected login body: %+v", req)
		}
		w.Write(envelope(t, map[string]any{"totp_required": true, "login_ticket": "lt-1"}))
	}))
	defer server.Close()

	svc := NewAuthService(NewAPIService(server.URL))
	resp, err := svc.Login("a@b.c", "pw")
	if err != nil {
		t.Fatalf("Login failed: %v", err)
	}
	if !resp.Success {
		t.Fatalf("expected success envelope, got %+v", resp)
	}
}

func TestAuthServiceLogout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/auth/logout" || r.Method != http.MethodPost {
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		w.Write(envelope(t, nil))
	}))
	defer server.Close()

	svc := NewAuthService(NewAPIService(server.URL))
	if err := svc.Logout(); err != nil {
		t.Fatalf("Logout failed: %v", err)
	}
}

func TestAuthServiceRefreshToken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/auth/refresh" || r.Method != http.MethodPost {
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		var req models.RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			t.Errorf("failed to decode refresh request: %v", err)
		}
		if req.RefreshToken != "rt-1" {
			t.Errorf("unexpected refresh token: %+v", req)
		}
		w.Write(envelope(t, models.TokenResponse{AccessToken: "at-2", RefreshToken: "rt-2", TokenType: "Bearer"}))
	}))
	defer server.Close()

	svc := NewAuthService(NewAPIService(server.URL))
	token, err := svc.RefreshToken("rt-1")
	if err != nil {
		t.Fatalf("RefreshToken failed: %v", err)
	}
	if token.AccessToken != "at-2" || token.RefreshToken != "rt-2" {
		t.Fatalf("unexpected token response: %+v", token)
	}
}

func TestMatchmakingServiceJoinSolo(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/matchmaking/join" || r.Method != http.MethodPost {
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		var body map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("failed to decode join body: %v", err)
		}
		if body["match_type"] != "1v1" {
			t.Errorf("unexpected match_type: %v", body["match_type"])
		}
		if _, present := body["party_members"]; present {
			t.Errorf("solo join must not send party_members: %v", body)
		}
		w.Write(envelope(t, []models.QueueEntry{{UID: 1, MatchType: "1v1", RankScore: 1000, EnqueuedAt: "2026-11-06T10:00:00Z"}}))
	}))
	defer server.Close()

	svc := NewMatchmakingService(NewAPIService(server.URL))
	entries, err := svc.Join("1v1", nil)
	if err != nil {
		t.Fatalf("Join failed: %v", err)
	}
	if len(entries) != 1 || entries[0].UID != 1 || entries[0].MatchType != "1v1" {
		t.Fatalf("unexpected entries: %+v", entries)
	}
}

func TestMatchmakingServiceJoinParty(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			MatchType    string   `json:"match_type"`
			PartyMembers []string `json:"party_members"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Errorf("failed to decode join body: %v", err)
		}
		if body.MatchType != "2v2" || len(body.PartyMembers) != 2 ||
			body.PartyMembers[0] != "aaaa" || body.PartyMembers[1] != "bbbb" {
			t.Errorf("unexpected join body: %+v", body)
		}
		w.Write(envelope(t, []models.QueueEntry{
			{UID: 1, MatchType: "2v2", PartyID: 9, EnqueuedAt: "2026-11-06T10:00:00Z"},
			{UID: 2, MatchType: "2v2", PartyID: 9, EnqueuedAt: "2026-11-06T10:00:00Z"},
		}))
	}))
	defer server.Close()

	svc := NewMatchmakingService(NewAPIService(server.URL))
	entries, err := svc.Join("2v2", []string{"aaaa", "bbbb"})
	if err != nil {
		t.Fatalf("Join failed: %v", err)
	}
	if len(entries) != 2 || entries[0].PartyID != 9 || entries[1].PartyID != 9 {
		t.Fatalf("unexpected entries: %+v", entries)
	}
}

func TestMatchmakingServiceLeave(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/matchmaking/leave" || r.Method != http.MethodDelete {
			t.Errorf("unexpected request %s %s", r.Method, r.URL.Path)
		}
		w.Write(envelope(t, nil))
	}))
	defer server.Close()

	svc := NewMatchmakingService(NewAPIService(server.URL))
	if err := svc.Leave(); err != nil {
		t.Fatalf("Leave failed: %v", err)
	}
}

func TestMatchmakingServiceStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/api/matchmaking/status" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		w.Write(envelope(t, models.MatchmakingStatus{
			InQueue:    true,
			QueueEntry: &models.QueueEntry{UID: 1, MatchType: "1v1", RankScore: 1000, EnqueuedAt: "2026-11-06T10:00:00Z"},
			RecentGroups: []models.FormedGroup{{
				GroupID:   7,
				MatchType: "1v1",
				FormedAt:  "2026-11-06T09:00:00Z",
				Members:   []models.GroupMember{{UID: 1, TeamID: "A", RankScore: 1000}, {UID: 2, TeamID: "B", RankScore: 1010}},
			}},
		}))
	}))
	defer server.Close()

	svc := NewMatchmakingService(NewAPIService(server.URL))
	status, err := svc.Status()
	if err != nil {
		t.Fatalf("Status failed: %v", err)
	}
	if !status.InQueue || status.QueueEntry == nil || status.QueueEntry.MatchType != "1v1" {
		t.Fatalf("unexpected status: %+v", status)
	}
	if len(status.RecentGroups) != 1 || status.RecentGroups[0].GroupID != 7 || len(status.RecentGroups[0].Members) != 2 {
		t.Fatalf("unexpected recent groups: %+v", status.RecentGroups)
	}
}

func TestRankingServiceGetMyRankingNotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"success":false,"message":"查询失败","code":"internal_error","error":"internal_error","meta":{"request_id":"x"}}`))
	}))
	defer server.Close()

	svc := NewRankingService(NewAPIService(server.URL))
	ranking, err := svc.GetMyRanking("1v1", 1)
	if err != nil {
		t.Fatalf("expected the missing-row envelope to map to an empty result, got error: %v", err)
	}
	if ranking != nil {
		t.Fatalf("expected nil ranking for a missing row, got %+v", ranking)
	}
}

func TestRankingServiceGetMyRankingTransportError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	server.Close()

	svc := NewRankingService(NewAPIService(server.URL))
	if _, err := svc.GetMyRanking("1v1", 1); err == nil {
		t.Fatal("expected transport error, got nil")
	}
}
