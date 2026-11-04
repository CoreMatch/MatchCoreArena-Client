# 0006. Cleanup Pass Checklist: Fixed Items and Pending Decisions

## Status
Accepted

## Date
2026-11-04 (cleanup commits listed in Evidence)

## Context
Per the author's 2026-11 instruction, the three MatchCoreArena repositories had
drifted and needed a low-risk cleanup pass: fix only items with a single correct
answer (compile breaks, doc-vs-code mismatches, dead config), and defer everything
that requires a design decision. This entry is the checklist for this repository.

## Decision

### Fixed in this pass

1. Removed obsolete `TestGreet` from `main_test.go` (commit
   `7ef8d17`): it called `App.Greet`, which does not exist anywhere in the
   repository, so `go test ./...` (and the CI test step) failed to compile.
   `TestAppCreation` was kept. No behavior change.
2. Aligned documentation with the code (commit `fbc3ade`):
   - README tech stack listed Gin for the backend; `go.mod` has no Gin
     dependency and the API layer is the standard library `net/http`
     (`internal/services/api.go:1-10`). Now states `net/http`.
   - README tech stack listed Material UI v6; `frontend/package.json:16-17`
     pins `^9.0.1`. Now states v9.
   - README and USAGE claimed the MIT License while the `LICENSE` file is
     AGPL-3.0 (661-line AGPL v3 text). Statements now say AGPL-3.0; the
     LICENSE file itself was not touched.
3. Removed the dead `SERVER_URL` environment variable from
   `docker-compose.yml` (commit `e4ffeac`): the config loader only reads
   `~/.matchcorearena/config.json` (`internal/config/config.go:14-36`); no code
   path consumes any environment variable.

### Not fixed — requires author decision

1. **`SERVER_URL` wiring**: only the dead claim was removed. If the env var
   should work, someone must choose its precedence relative to
   `config.json` (env-over-file vs file-over-env), which changes effective
   container behavior.
2. **UUID vs UID drift**: the client calls `GET /api/users/{uuid}`
   (`internal/services/user.go`) while the server parses `:uid` as an int64
   (`MatchCoreArena-Server api/handler/user.go GetByUID` via
   `strconv.ParseInt`). The server currently rejects these calls. Direction to
   choose: client switches to numeric UID, or server adds a UUID lookup.
3. **"Automatic token refresh" claim in USAGE.md**: the `RefreshToken` binding
   exists end-to-end but the frontend never calls it. The doc line is left
   as-is until the author decides whether to wire the refresh up or remove the
   binding; both options change behavior or API surface.
4. **Go bindings without UI consumers**: `ReportMatchResult`, `GetMatch`,
   `GetMyMatches`, `CreateTeam`, `AddExperience`, `RefreshToken` have no
   callers in `frontend/src`. Keep (planned features) or remove — needs intent.
5. **README feature list drift**: "Match Reporting" and "Team Management" are
   listed as features but have no UI surface (consequence of item 4).
6. **Release artifacts**: `.github/workflows/release.yml` publishes `.exe`
   artifacts but only builds on `ubuntu-latest` with no Windows job or
   cross-compilation step; the source of the Windows binaries is unknown.
7. **CI Linux build dependencies**: the build job does not install WebKitGTK
   headers, which `wails build` requires on Linux; whether CI actually
   succeeds is unverified (not reproducible from inside the repo).
8. **Docker image purpose**: the Dockerfile packages a GUI desktop binary into
   a headless alpine image; the intended use is not documented.

## Consequences
- The repository now compiles and passes `go build ./...`, `go vet ./...`,
  `go test ./...` (verified 2026-11-04 after the fix; before the fix
  `go test` failed to compile because of `TestGreet`).
- Frontend `npm run build` (tsc + vite) passes (verified 2026-11-04).
- The pending items above remain open; each needs a semantic or design choice
  that this pass was explicitly not allowed to make.

## Evidence
- `7ef8d17` test: remove obsolete TestGreet referencing non-existent App.Greet
- `fbc3ade` docs: align tech stack and license statements with the code
- `e4ffeac` chore(docker): drop SERVER_URL env var that no code consumes
- `internal/config/config.go:14-36` (config only from JSON file, no env reads)
- `internal/services/api.go:1-10` (net/http, no Gin)
- `frontend/package.json:16-17` (MUI ^9.0.1)
- `LICENSE:1-3` (AGPL v3 header) vs README/USAGE license statements before the fix
