# 0002. Direct Connection to MatchCoreArena-Server Through One Configurable Base URL

## Status
Accepted

## Date
2026-09-12 (HTTP service layer in initial commit
e1f5cd879d3da5e6e18acab811ccf01d35b9d8f8; default switched from
`http://localhost:8080` to the production endpoint in commit
71ef6acf495282d1dab091a4ba475ceeb4011b6f the same day)

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
- The React frontend makes no direct HTTP calls of its own. Earlier
  `fetch('/api/...')` calls in LoginView were replaced by Wails bindings in
  commit fcec9aa044bc80554691877a09ca49da920d2541, and the remaining fetches
  in App/FriendList/RankingView were replaced in commit
  54ebf36c0a5066c4686f16fef82382c71ea967e6. A search of `frontend/src` at
  HEAD finds no `fetch(`, `axios`, or absolute `http(s)://` calls.

Cross-verification against the read-only MatchCoreArena-Server worktree:
every client endpoint above matches a route registered in the server's
`api/router.go` (auth group lines 48-53; logout line 60; users 63-65;
friends 68-72; teams 75-81; matches 84-86; rankings 89-90), including the
HTTP verbs (PUT for accept/reject, DELETE for removals).

## Consequences
- One config value redirects the whole client (useful for dev vs.
  production); `start.sh` seeds `~/.matchcorearena/config.json` from
  `config.example.json` on first run.
- Single point of failure: no fallback URL, no retry logic; any HTTP status
  ≥ 400 becomes a plain error string surfaced to the UI.
- The `SERVER_URL` environment variable formerly set in `docker-compose.yml`
  was not read anywhere in the Go code (no `os.Getenv`/`LookupEnv` in the
  repo); configuration effectively comes only from the mounted
  `~/.matchcorearena/config.json`. The dead env var was removed from
  docker-compose.yml on 2026-11-04 (commit e4ffeac, see 0006); wiring a
  real env override remains a pending decision.
- The arena REST API itself is defined inside MatchCoreArena-Server, not in
  HA-Contract (HA-Contract's documented scope covers HRPAuth, HASkinLib,
  WinnerProxy, Cascade, etc.). This entry documents internal client
  behavior only; it does not define that API.
- Limitation: endpoint paths are hard-coded in seven Go service files; there
  is no shared/generated client, so client and server can drift silently
  (see entry 0004 for one observed drift).

## Evidence
- internal/config/config.go:14-36 (LoadConfig with default `https://arena.mcnb.dev/`), :55-58 (config path `~/.matchcorearena/config.json`)
- config.example.json:1-4
- internal/services/api.go:12-69 (APIService, 10s timeout at :21-23, Bearer header at :49-51)
- Endpoint call sites: internal/services/auth.go:23,42,64,82; user.go:18,42,72; friend.go:18,48,72,81,90; team.go:26,44,62,70,96,120,128; match.go:18,36,54; ranking.go:18,42
- Commit 71ef6acf495282d1dab091a4ba475ceeb4011b6f — "feat: update server URL to production endpoint" (diff changes `http://localhost:8080` → `https://arena.mcnb.dev/` in config.go and config.example.json)
- Commit fcec9aa044bc80554691877a09ca49da920d2541 and commit 54ebf36c0a5066c4686f16fef82382c71ea967e6 (removal of frontend `fetch` in favor of Wails bindings)
- Cross-repo (read-only): MatchCoreArena-Server api/router.go:48-94 (matching route registrations)
- docker-compose.yml:6-9 (volume mount for `~/.matchcorearena`; the formerly committed SERVER_URL env var was removed on 2026-11-04, commit e4ffeac, because no code reads it)
- start.sh:40-47 (seeds default config on first run)
