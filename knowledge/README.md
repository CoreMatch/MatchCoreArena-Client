# Knowledge Base

This knowledge base is the project's memo to itself. It is self-hosted and
maintained by this repository (MatchCoreArena-Client) and records internal
design decisions and their history. It does **not** define or override
outward behavior. Outward behavior is specified by HA-Contract
(https://github.com/SamuelCheston/HA-Contract); if an entry here ever
conflicts with HA-Contract, fix the entry, not the contract.

## Entries

| ID | Title | Status | Summary |
|----|-------|--------|---------|
| [0001](0001-wails-v2-desktop-go-backend-react-frontend.md) | Wails v2 Desktop App: Go Binding Layer Plus Embedded React Frontend | Accepted | The client is a Wails v2 desktop application: a Go layer (config/handlers/services) exposes bound methods to a React 19 + TypeScript + MUI frontend that is compiled into `frontend/dist` and embedded into the binary. |
| [0002](0002-single-base-url-direct-connection-to-arena-server.md) | Direct Connection to MatchCoreArena-Server Through One Configurable Base URL | Accepted | All network traffic goes through a single `net/http`-based APIService pointed at one `server_url` (default `https://arena.mcnb.dev/`, from `~/.matchcorearena/config.json`); every client endpoint maps to a route registered in MatchCoreArena-Server. |
| [0003](0003-client-displays-ratings-but-never-computes-them.md) | The Client Only Displays Ratings; It Never Computes Them | Accepted | No Elo/MMR/rating math exists in this repository; the client fetches leaderboards and personal scores from the server and renders them, and match reporting is a raw-data pass-through. |
| [0004](0004-token-session-via-arena-server-login-ticket-and-totp.md) | Player Identity Is a Bearer-Token Session Obtained from the Arena Server (login-ticket + Optional TOTP) | Accepted | Login is email/password → `/api/auth/login-ticket` → optional TOTP step → access/refresh token pair; tokens are stored in browser localStorage and mirrored into the in-memory Go APIService via `SetToken`, then sent as `Authorization: Bearer`. |
| [0005](0005-wails-cli-build-ci-artifacts-and-tagged-releases.md) | Build and Distribution: Wails CLI Builds, CI Artifacts, GitHub Releases on Tags | Accepted | `wails dev`/`wails build` (wrapped by Makefile) are the only build paths; CI builds and uploads artifacts on main/develop, and a release workflow publishes binaries on `v*` tags; a Dockerfile exists but its runtime purpose is undocumented. |
| [0006](0006-cleanup-pass-checklist.md) | Cleanup Pass Checklist: Fixed Items and Pending Decisions | Accepted | 2026-11-04 low-risk cleanup: fixed the compile-breaking test, doc-vs-code mismatches, and a dead env var; design-level issues are listed as pending author decisions. |

## Maintenance

- New entries take the next sequential number (`NNNN`, zero-padded, starting
  from 0001) and a kebab-case slug: `knowledge/NNNN-<slug>.md`.
- History is not rewritten: accepted entries are kept as-is even when they
  age.
- An entry that is no longer true is marked `Superseded` (or `Historical`) in
  its Status section and linked to its replacement — it is never deleted.
- Every factual claim needs evidence that was actually checked (`file:line`
  and/or full commit hash). Anything that cannot be verified is written as
  "not verified" or "intent not documented in repo" — never invented.
- Entries are written in English.
