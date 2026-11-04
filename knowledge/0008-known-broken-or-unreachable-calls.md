# 0008. Known Broken or Unreachable Calls (Verified Inventory)

## Status
Accepted

## Date
2026-11-05 (verification date; the underlying drift accumulated between 2026-09-12 and 2026-11-04)

## Context
The client and server evolved separately and the repository carries several
call paths that are broken or unreachable. This entry inventories them as
verified facts (each checked against HEAD on 2026-11-05); the decisions about
fixing or removing them remain with the author (see 0006).

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
   was left in place pending the author's decision (see 0006).
3. **Six Go bindings have no UI consumer** (searched `frontend/src` on HEAD):
   `ReportMatchResult`, `GetMatch`, `GetMyMatches`, `CreateTeam`,
   `AddExperience`, `RefreshToken`. They are reachable only programmatically.
4. **Release artifacts include a Windows binary with no Windows build path**:
   the release workflow runs a single `ubuntu-latest` job with no cross-
   compilation, yet uploads `build/bin/MatchCoreArenaClient.exe`. Where the
   `.exe` comes from is not verifiable in the repo (not verified).
5. **CI Linux build dependencies are not installed**: the build workflow has
   no WebKitGTK installation step, which `wails build` requires on Linux;
   whether the CI build actually succeeds is not verifiable from the repo
   (not verified).

## Consequences
- Items 1–3 are dead or broken surface area: they mislead readers of the
  binding list and (for item 2) the usage docs, but they do not break any
  working UI path today.
- Items 4–5 mean the release/build pipelines cannot be confirmed working
  from inside the repository.
- Costs/limitations: fixing any item requires a direction choice (e.g. for
  item 1, switch the client to numeric UIDs or add a server-side UUID
  lookup), which is explicitly deferred (0006). This entry only records
  facts; it prescribes no fix.

## Evidence
- internal/services/user.go:41-42 (`GetUserByUUID` → `GET /api/users/%s` with a UUID string)
- Cross-repo (read-only): MatchCoreArena-Server api/handler/user.go:35-37 (`GetByUID` parses `:uid` via `strconv.ParseInt`)
- Search of `frontend/src` on 2026-11-05 HEAD: 0 hits for `GetUserByUUID`, `RefreshToken`, `ReportMatchResult`, `GetMatch`, `GetMyMatches`, `CreateTeam`, `AddExperience`
- app.go:38-40, 55-57, 59-61, 94-95, 123-132 (the bindings exist on the Go side)
- USAGE.md:28 ("Automatic token refresh" feature claim)
- .github/workflows/release.yml:10 (single job, `runs-on: ubuntu-latest`), :42 (uploads `MatchCoreArenaClient.exe`)
- .github/workflows/build.yml (no WebKitGTK/`apt` installation step found on search)
- Cross-reference: 0006 (all items listed there as pending author decisions)
