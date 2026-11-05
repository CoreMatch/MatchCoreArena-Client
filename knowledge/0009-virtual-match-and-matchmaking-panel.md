# 0009. Virtual Match and Matchmaking Panel

## Status
Accepted

## Context
The server exposes virtual matches (`POST /api/matches/virtual`) and
matchmaking endpoints (`/api/matchmaking/*`) so ratings and matching can be
exercised without a real game (MatchCoreArena-Server knowledge 0009). The
client needs an operable surface to inject match data, observe rating
changes, and drive the queue.

## Decision
- The "Virtual Match" navigation page (`frontend/src/components/VirtualMatchView.tsx`)
  provides three capabilities:
  - single virtual-match submission: a form builds a `VirtualReportInput`
    (match type, optional map/duration, any number of teams with
    win/lose/draw results and member UUIDs) and calls the bound
    `ReportVirtualMatch`; the response table renders each participant's
    rating before/delta/after as returned by the server;
  - batch injection: a JSON array of virtual-match payloads is parsed
    locally and submitted sequentially, with a per-item success/failure
    summary;
  - matchmaking controls: join/leave the queue for a mode and refresh
    `GET /api/matchmaking/status`, rendering queue state and recent formed
    groups.
- Virtual-match submission requires a token carrying the `match:report`
  scope; the page has a Reporter Token field (persisted in localStorage
  under `mca_reporter_token`) and passes it to `ReportVirtualMatch` as an
  explicit second argument (`APIService.PostWithToken`). Left empty, the
  session token is used and the server answers 403. Matchmaking calls use
  the ordinary session token.
- The Go layer adds typed models mirroring the contracted schemas
  (`internal/models/match.go`: VirtualReportInput, VirtualMatchResult,
  ParticipantSettlement, QueueEntry, MatchmakingStatus, FormedGroup) and a
  `MatchmakingService` alongside the existing services; bindings are
  exposed through `App.ReportVirtualMatch`, `App.JoinMatchmaking`,
  `App.LeaveMatchmaking`, `App.GetMatchmakingStatus`.
- Consistent with 0003, the client performs no rating computation: it
  renders the server's settlement results verbatim.

## Consequences
- The Reporter Token is stored unencrypted in localStorage; acceptable for
  a desktop tool operated by the deployment owner, but anyone with access
  to the OS profile can read it.
- Batch submission is sequential and stops at nothing: failures are
  reported per item and do not roll back earlier matches (each virtual
  match settles in its own server transaction).

## Evidence
- frontend/src/components/VirtualMatchView.tsx — single/batch submission and matchmaking panel
- frontend/src/App.tsx (field: virtual) — Virtual Match navigation entry
- internal/services/match.go::ReportVirtualMatch — virtual report call with explicit token
- internal/services/api.go::PostWithToken — explicit-token request path
- internal/services/matchmaking.go::Join — matchmaking endpoint client
- internal/models/match.go::VirtualReportInput — virtual/matchmaking models
- app.go::ReportVirtualMatch — Wails bindings
- HA-Contract (read-only reference): docs/api/openapi/matchcorearena-business.yaml (field: /api/matches/virtual) [xref]
