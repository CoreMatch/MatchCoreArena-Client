# 0002. Direct Connection to MatchCoreArena-Server Through One Configurable Base URL

## Status
Accepted

## Context
The client has no backend of its own; all data (profile, friends, teams,
matches, rankings) lives in MatchCoreArena-Server. The client must know
where that server is and how to talk to it.

## Decision
The client connects directly to MatchCoreArena-Server through a single
configurable base URL:

- `internal/config` loads `~/.matchcorearena/config.json`
  (`{"server_url": ..., "debug": ...}`), defaulting to
  `https://arena.mcnb.dev/` when the file is absent.
- All HTTP goes through one `APIService` built on plain `net/http`:
  JSON request/response, a 10-second client timeout, and an
  `Authorization: Bearer <token>` header whenever a token is set.
- The endpoint set used by the client is: `/api/auth/login-ticket`,
  `/api/auth/totp-verify`, `/api/auth/refresh`, `/api/auth/logout`,
  `/api/users/me`, `/api/users/{uuid}`, `/api/users/me/experience`,
  `/api/friends` (+ `/{id}/accept`, `/{id}/reject`, `/{id}`),
  `/api/teams` (+ members and role routes), `/api/matches` (+ `/{id}`,
  `/me`), `/api/rankings/{type}`, `/api/rankings/me`.
- The React frontend makes no direct HTTP calls of its own: a search of
  `frontend/src` finds no `fetch(`, `axios`, or absolute `http(s)://`
  calls; every server interaction goes through the Wails bindings.

Cross-verification against the read-only MatchCoreArena-Server worktree:
every client endpoint above matches a route registered in the server's
/home/lnb/Desktop/HA/MatchCoreArena-Server/api/router.go::Register
(auth group, logout, users, friends, teams, matches, rankings routes),
including the HTTP verbs (PUT for accept/reject, DELETE for removals).

## Consequences
- One config value redirects the whole client (useful for dev vs.
  production); `start.sh` seeds `~/.matchcorearena/config.json` from
  `config.example.json` on first run.
- Single point of failure: no fallback URL, no retry logic; any HTTP status
  ≥ 400 becomes a plain error string surfaced to the UI.
- Configuration comes only from the mounted `~/.matchcorearena/config.json`:
  no code path reads environment variables (no `os.Getenv`/`LookupEnv` in
  the repo). Wiring a real env override (e.g. `SERVER_URL` for the
  containerized path) is a pending author decision (see 0006).
- The arena REST API itself is defined inside MatchCoreArena-Server, not in
  HA-Contract (HA-Contract's documented scope covers HRPAuth, HASkinLib,
  WinnerProxy, Cascade, etc.). This entry documents internal client
  behavior only; it does not define that API.
- Limitation: endpoint paths are hard-coded in six Go service files; there
  is no shared/generated client, so client and server can drift silently
  (see entry 0004 for one observed drift).

## Evidence
- internal/config/config.go::LoadConfig (LoadConfig with default `https://arena.mcnb.dev/`), internal/config/config.go::getConfigPath (config path `~/.matchcorearena/config.json`)
- config.example.json (field: server_url)
- internal/services/api.go::APIService (APIService, 10s timeout in internal/services/api.go::NewAPIService, Bearer header in internal/services/api.go::makeRequest)
- Endpoint call sites: internal/services/auth.go::Login, internal/services/auth.go::VerifyTOTP, internal/services/auth.go::RefreshToken, internal/services/auth.go::Logout; internal/services/user.go::GetCurrentUser, internal/services/user.go::GetUserByUUID, internal/services/user.go::AddExperience; internal/services/friend.go::GetFriends, internal/services/friend.go::SendFriendRequest, internal/services/friend.go::AcceptFriendRequest, internal/services/friend.go::RejectFriendRequest, internal/services/friend.go::DeleteFriend; internal/services/team.go::CreateTeam, internal/services/team.go::GetTeam, internal/services/team.go::DisbandTeam, internal/services/team.go::GetTeamMembers, internal/services/team.go::AddTeamMember, internal/services/team.go::UpdateMemberRole, internal/services/team.go::RemoveTeamMember; internal/services/match.go::ReportMatchResult, internal/services/match.go::GetMatch, internal/services/match.go::GetMyMatches; internal/services/ranking.go::GetTopRankings, internal/services/ranking.go::GetMyRanking
- Cross-repo (read-only): /home/lnb/Desktop/HA/MatchCoreArena-Server/api/router.go::Register (matching route registrations)
- docker-compose.yml (field: volumes) (volume mount for `~/.matchcorearena`)
- start.sh::matchcorearena (seeds default config on first run)
