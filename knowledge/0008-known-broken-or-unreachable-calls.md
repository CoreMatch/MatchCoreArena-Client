# 0008. Known Broken or Unreachable Calls (Verified Inventory)

## Status
Accepted

## Context
The repository carries several call paths that are broken or unreachable.
This entry inventories them as verified facts; the decisions about fixing
or removing them remain with the author (see 0006).

## Decision
Record the following verified inventory:

1. **`GET /api/users/{uuid}` is rejected by the server.** The client sends a
   UUID string (`GetUserByUUID`), but the server route handler parses `:uid`
   with `strconv.ParseInt`, so any real UUID fails with a parameter error.
   Additionally, no frontend code calls the `GetUserByUUID` binding, so the
   broken path is currently unreachable from the UI as well.
2. **Token refresh is unreachable from the UI.** The `RefreshToken` chain
   exists end-to-end (frontend binding → Go handler → service → server
   `/api/auth/refresh`), but `frontend/src` contains zero calls to it.
   USAGE.md still lists "Automatic token refresh" as a feature; the doc line
   is left in place pending the author's decision (see 0006).
3. **Six Go bindings have no UI consumer** (searched `frontend/src`):
   `ReportMatchResult`, `GetMatch`, `GetMyMatches`, `CreateTeam`,
   `AddExperience`, `RefreshToken`. They are reachable only programmatically.
4. **Release artifacts include a Windows binary with no Windows build path**:
   the release workflow runs a single `ubuntu-latest` job with no cross-
   compilation, yet uploads `build/bin/MatchCoreArenaClient.exe`. Where the
   `.exe` comes from is not verifiable in the repo (not verified).

## Consequences
- Items 1–3 are dead or broken surface area: they mislead readers of the
  binding list and (for item 2) the usage docs, but they do not break any
  working UI path today.
- Item 4 means the release pipeline cannot be confirmed working from inside
  the repository.
- Costs/limitations: fixing any item requires a direction choice (e.g. for
  item 1, switch the client to numeric UIDs or add a server-side UUID
  lookup), which is explicitly deferred (0006). This entry only records
  facts; it prescribes no fix.

## Evidence
- internal/services/user.go::GetUserByUUID (`GetUserByUUID` → `GET /api/users/%s` with a UUID string)
- Cross-repo (read-only): /home/lnb/Desktop/HA/MatchCoreArena-Server/api/handler/user.go::GetByUID (`GetByUID` parses `:uid` via `strconv.ParseInt`)
- Search of `frontend/src`: 0 hits for `GetUserByUUID`, `RefreshToken`, `ReportMatchResult`, `GetMatch`, `GetMyMatches`, `CreateTeam`, `AddExperience`
- app.go::RefreshToken, app.go::GetUserByUUID, app.go::AddExperience, app.go::CreateTeam, app.go::ReportMatchResult, app.go::GetMatch, app.go::GetMyMatches (the bindings exist on the Go side)
- USAGE.md::Automatic ("Automatic token refresh" feature claim)
- .github/workflows/release.yml::ubuntu (single job, `runs-on: ubuntu-latest`), .github/workflows/release.yml::exe (uploads `MatchCoreArenaClient.exe`)
- Cross-reference: 0006 (all items listed there as pending author decisions)
