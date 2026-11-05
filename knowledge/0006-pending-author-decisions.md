# 0006. Pending Author Decisions

## Status
Accepted

## Context
Several open questions in this repository have no single correct answer:
each needs a semantic or design choice by the author. This entry lists them
so they stay visible until decided.

## Decision
Record the following items as pending author decisions:

1. **`SERVER_URL` wiring**: no code path reads environment variables
   (`internal/config/config.go::LoadConfig` reads only
   `~/.matchcorearena/config.json`). If an env var should work, someone
   must choose its precedence relative to `config.json` (env-over-file vs
   file-over-env), which changes effective container behavior.
2. **UUID vs UID drift**: the client calls `GET /api/users/{uuid}`
   (`internal/services/user.go`) while the server parses `:uid` as an int64
   (`/home/lnb/Desktop/HA/MatchCoreArena-Server/api/handler/user.go::GetByUID` via
   `strconv.ParseInt`). The server rejects these calls. Direction to
   choose: client switches to numeric UID, or server adds a UUID lookup.
3. **"Automatic token refresh" claim in USAGE.md**: the `RefreshToken` binding
   exists end-to-end but the frontend never calls it. Decide whether to wire
   the refresh up or remove the binding; both options change behavior or API
   surface.
4. **Go bindings without UI consumers**: `ReportMatchResult`, `GetMatch`,
   `GetMyMatches`, `CreateTeam`, `AddExperience`, `RefreshToken` have no
   callers in `frontend/src`. Keep (planned features) or remove — needs intent.
5. **README feature list drift**: "Match Reporting" and "Team Management" are
   listed as features but have no UI surface (consequence of item 4).
6. **Release artifacts**: `.github/workflows/release.yml` publishes `.exe`
   artifacts but only builds on `ubuntu-latest` with no Windows job or
   cross-compilation step; the source of the Windows binaries is unknown.
7. **Docker image purpose**: the Dockerfile packages a GUI desktop binary into
   a headless alpine image; the intended use is not documented.

## Consequences
- The repository compiles and passes `go build ./...`, `go vet ./...`,
  `go test ./...`; frontend `npm run build` (tsc + vite) passes.
- The items above remain open; each blocks on an author choice.

## Evidence
- internal/config/config.go::LoadConfig (config only from JSON file, no env reads)
- internal/services/user.go::GetUserByUUID (client side of the UUID vs UID drift)
- USAGE.md::Automatic ("Automatic token refresh" feature claim)
- app.go::ReportMatchResult (representative binding without a UI consumer)
- README.md::Match Reporting (feature listed without a UI surface)
- .github/workflows/release.yml::exe (uploads `MatchCoreArenaClient.exe`)
- Dockerfile::MatchCoreArenaClient (GUI binary in a headless alpine image)
- main_test.go::TestAppCreation (the only Go test; suite compiles and passes)
- Cross-repo (read-only): /home/lnb/Desktop/HA/MatchCoreArena-Server/api/handler/user.go::GetByUID (`:uid` parsed via `strconv.ParseInt`)
