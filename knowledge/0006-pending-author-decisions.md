# 0006. Pending Author Decisions

## Status
Accepted

## Context
Several open questions in this repository have no single correct answer:
each needs a semantic or design choice by the author. This entry lists them
so they stay visible until decided. The root-level `PENDING-DECISIONS.md`
mirrors this list for task workflows.

## Decision
Record the following items as pending author decisions:

1. **`SERVER_URL` wiring**: no code path reads environment variables
   (`internal/config/config.go::LoadConfig` reads only
   `~/.matchcorearena/config.json`). If an env var should work, someone
   must choose its precedence relative to `config.json` (env-over-file vs
   file-over-env), which changes effective container behavior.
2. **Docker image purpose**: the Dockerfile packages a GUI desktop binary
   into a headless alpine image; the intended use is not documented.

Resolved since the read-only refactor (see 0010/0011):

- **UUID vs UID drift**: investigated — the client sent a UUID string to
  `GET /api/users/:uid`, which the server parses as an int64 UID; the
  server's authoritative identity is the numeric uid resolved from the
  token. Resolution: the broken `GetUserByUUID` binding/service was removed
  (no UI consumer; read-only surface needs no by-id lookup) and the models
  were unified to the server's uid basis (`models.User.UID`,
  `models.Ranking.UserUID`); RankingView renders `Player #{uid}`.
- **Token refresh**: the server's `/api/auth/refresh` is the designated
  recovery path (middleware answers 401 `oauth_token_expired` expecting a
  client refresh). Resolution: wired via `frontend/src/session.ts`
  (authFetch: 401 → single-flight refresh → retry once; failed refresh →
  logout to the login screen).
- **UI-less bindings / README feature drift**: closed by the read-only
  refactor; the remaining bound surface is fully consumed or session
  infrastructure, pinned by 0011's tests.
- **Release Windows artifact**: the missing build path was filled
  mechanically (mingw cross-compile in `release.yml`); no signing
  certificate is involved. Verification at the next tag run is tracked in
  0008, not as an author decision.

## Consequences
- The repository compiles and passes `go build ./...`, `go vet ./...`,
  `go test ./...`; frontend `npm run build` (tsc + vite) passes.
- The two open items above remain; each blocks on an author choice.

## Evidence
- internal/config/config.go::LoadConfig (config only from JSON file, no env reads)
- Dockerfile::MatchCoreArenaClient (GUI binary in a headless alpine image)
- internal/models/user.go::UID, internal/models/ranking.go::UserUID (uid-based identity models)
- frontend/src/session.ts::authFetch (token refresh wired)
- .github/workflows/release.yml::windows (Windows cross-compile step added)
- Cross-reference: 0008 (verified inventory), 0010 (read-only client), 0011 (read-only invariant)
