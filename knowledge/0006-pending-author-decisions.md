# 0006. Pending Author Decisions

## Status
Accepted

## Context
Several open questions in this repository have no single correct answer:
each needs a semantic or design choice by the author. This entry lists them
so they stay visible until decided. The root-level `PENDING-DECISIONS.md`
mirrors this list for task workflows.

## Decision
No open items remain. Both former pending items were resolved on
2026-11-08 (leftover-cleanup batch):

1. **`SERVER_URL` wiring** — settled as the conventional precedence
   "explicit config first, env second, built-in default last": a non-empty
   `server_url` in `~/.matchcorearena/config.json` always wins; otherwise
   `MCA_SERVER_URL` (the env name the code actually reads) applies;
   otherwise the built-in default `https://arena.mcnb.dev/`. Implemented in
   `internal/config/config.go::LoadConfig` and pinned by
   `internal/config/config_test.go::TestServerURLPrecedence`
   (file-beats-env; env when the file omits or empties server_url; default
   fallback; file-sourced game-server fields). Documented in README/USAGE
   and `.env.example` (which previously advertised an unread `SERVER_URL`
   name). Note: the pre-settlement code had env-over-file precedence
   (commit 88fd723); the settlement flips it so an explicit user config is
   never silently overridden by the environment.
2. **Docker image purpose** — decision: keep the Dockerfile unchanged and
   document its status. The image packages the Wails GUI desktop binary
   into a headless alpine runtime that cannot display a GUI, and the
   builder stage lacks the GTK/WebKit toolchain a Linux Wails build needs;
   it is a build/packaging placeholder, not a runnable runtime. No
   config-path adjustment was required for the precedence settlement:
   `docker-compose.yml` mounts `~/.matchcorearena` into the container, so
   the mounted config file keeps highest precedence, and `MCA_SERVER_URL`
   can additionally be injected through the compose environment. Removing
   or reworking the image remains an author option; nothing depends on it
   today.

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
- No open items remain in this entry; the root `PENDING-DECISIONS.md`
  mirrors the resolutions.

## Evidence
- internal/config/config.go::LoadConfig (server_url precedence: file > MCA_SERVER_URL > default)
- Dockerfile::MatchCoreArenaClient (GUI binary in a headless alpine image)
- internal/models/user.go::UID, internal/models/ranking.go::UserUID (uid-based identity models)
- frontend/src/session.ts::authFetch (token refresh wired)
- .github/workflows/release.yml::windows (Windows cross-compile step added)
- Cross-reference: 0008 (verified inventory), 0010 (read-only client), 0011 (read-only invariant)
