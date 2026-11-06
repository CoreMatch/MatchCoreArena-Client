# Knowledge Base

This knowledge base is the project's memo to itself. It is self-hosted and
maintained by this repository (MatchCoreArena-Client) and records internal
design decisions in their current state. It does **not** define or override
outward behavior. Outward behavior is specified by HA-Contract
(https://github.com/SamuelCheston/HA-Contract); if an entry here ever
conflicts with HA-Contract, fix the entry, not the contract.

## Entries

| ID | Title | Status | Summary |
|----|-------|--------|---------|
| [0001](0001-wails-v2-desktop-go-backend-react-frontend.md) | Wails v2 Desktop App: Go Binding Layer Plus Embedded React Frontend | Accepted | The client is a Wails v2 desktop application: a Go layer (config/handlers/services) exposes bound methods to a React 19 + TypeScript + MUI frontend that is compiled into `frontend/dist` and embedded into the binary. |
| [0002](0002-single-base-url-direct-connection-to-arena-server.md) | Direct Connection to MatchCoreArena-Server Through One Configurable Base URL | Accepted | All network traffic goes through a single `net/http`-based APIService pointed at one `server_url` (default `https://arena.mcnb.dev/`, from `~/.matchcorearena/config.json`); every client endpoint maps to a route registered in MatchCoreArena-Server. |
| [0003](0003-client-displays-ratings-but-never-computes-them.md) | The Client Only Displays Ratings; It Never Computes Them | Accepted | No Elo/MMR/rating math exists in this repository; the client fetches leaderboards, personal scores and server-computed match settlement fields and renders them, and submits no match data at all. |
| [0004](0004-token-session-via-arena-server-login-ticket-and-totp.md) | Player Identity Is a Bearer-Token Session Obtained from the Arena Server (login-ticket + Optional TOTP) | Accepted | Login is email/password → `/api/auth/login-ticket` → optional TOTP step → access/refresh token pair; tokens are stored in browser localStorage and mirrored into the in-memory Go APIService via `SetToken`; on a 401 the session layer refreshes via `/api/auth/refresh` and retries, logging out only when the refresh fails. |
| [0005](0005-wails-cli-build-ci-artifacts-and-tagged-releases.md) | Build and Distribution: Wails CLI Builds, CI Artifacts, GitHub Releases on Tags | Accepted | `wails dev`/`wails build` (wrapped by Makefile) are the only build paths; CI builds and uploads artifacts on main/develop, and a release workflow publishes binaries on `v*` tags; a Dockerfile exists but its runtime purpose is undocumented. |
| [0006](0006-pending-author-decisions.md) | Pending Author Decisions | Accepted | Open design questions that need author decisions: env-var wiring, Docker image purpose. |
| [0007](0007-ecosystem-boundary-client-talks-only-to-arena-server.md) | Ecosystem Boundary: The Client Talks Only to MatchCoreArena-Server | Accepted | Zero HRPAuth/Yggdrasil/WinnerProxy/skin-service references; HRPAuth is reached only through the server's transparent auth proxy. |
| [0008](0008-known-broken-or-unreachable-calls.md) | Known Broken or Unreachable Calls (Verified Inventory) | Accepted | The release Windows cross-build is added but unverified until the next tag run; friend queries surface the server's 501. |
| [0010](0010-read-only-client-submission-moved-to-maintenanceview.md) | Read-Only Client: Submission and Matchmaking Moved to MaintenanceView | Accepted | The client holds no match-data write surface: bound surface is session auth, queries and the player's own queue operations on uid-based identity; match reporting stays in the maintenance panel, the queue returned to the client (Play). |
| [0011](0011-read-only-invariant-and-its-re-checkable-criteria.md) | Read-Only Invariant and Its Re-Checkable Criteria | Accepted | Three tests pin the surface guarantee: the bound methods match an allow-list (auth, queries, queue operations, local handoff/settings — no match-data writes), frontend sources make no direct network calls, and generated bindings stay in sync; re-check with `go test ./...`. |
| [0012](0012-match-handoff-sender-interop-spec-v1.md) | Match Handoff Sender (INTEROP-SPEC v1) | Accepted | Settled matches are handed to SamuelClient over a loopback, token-authenticated channel (credential-free payload, deep-link wake-up, 30 s retry) with readable degradations and a copyable manual-join address; Linux-first, Win/mac degrade to manual join. |

## Maintenance

- New entries take the next sequential number (`NNNN`, zero-padded, starting
  from 0001) and a kebab-case slug: `knowledge/NNNN-<slug>.md`.
- Entries describe the project's current state and are updated when the
  code changes. Paragraphs about removed code or superseded behavior are
  deleted, not kept; the only exception is a past design-intent change that
  is needed to explain why the present differs from what readers might
  expect.
- Every factual claim needs evidence that was actually checked (a
  `file:line`, `file::Symbol`, or `file (field: key)` anchor in the repo).
  Anything that cannot be verified is written as "not verified" or "intent
  not documented in repo" — never invented.
- Entries are written in English.
