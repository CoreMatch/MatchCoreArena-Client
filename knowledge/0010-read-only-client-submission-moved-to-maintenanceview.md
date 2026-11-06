# 0010. Read-Only Client: Submission and Matchmaking Moved to MaintenanceView

## Status
Accepted

## Context
The client previously hosted a Virtual Match page that injected single or
batched virtual matches and drove the matchmaking queue (the former entry
0009). Operating surfaces that mutate rating-relevant state belong in an
operational tool rather than a player client, so the submission capability
was relocated to the maintenance panel (MatchCoreArena-MaintenanceView).
Later (server contract v1.4.0, party matchmaking), the author moved the
matchmaking queue back into this client as the player-facing entry, while
match reporting remains in the maintenance panel / game-side reporting —
hence the current split: queue in the client, reporting out of it.

## Decision
- The desktop client holds no match-data write surface. The bound surface
  is session auth, read queries, and the player's own matchmaking queue
  operations (author policy: queueing is allowed; match reporting and any
  other match-data writes stay out of the client):
  `Login`, `VerifyTOTP`, `RefreshToken`, `Logout`, `SetToken`,
  `GetCurrentUser`, `GetFriends`, `GetTopRankings`,
  `GetMyRanking`, `GetMatch`, `GetMyMatches`,
  `JoinMatchmaking`, `LeaveMatchmaking`, `GetMatchmakingStatus`.
  Identity follows the server's authoritative numeric uid
  (`models.User.UID`, `models.Ranking.UserUID`); the former UUID-string
  lookup was removed.
- The pages are:
  - Play (`frontend/src/components/PlayView.tsx`): profile summary, the
    rank card, the recent-matches list, and the matchmaking queue cycle
    (idle → queued → found → in-match → settled) driven by polling
    `GET /api/matchmaking/status`; party join sends `party_members`
    (UUID roster, same field name as the server/ops panel); a settled
    cycle shows the recorded match id with a deep link into Career detail;
  - Career (`frontend/src/components/MyMatchesView.tsx`): paginated
    `GET /api/matches/me` list plus per-match detail via `GET /api/matches/{id}`
    (participants with kills/deaths/survival and server-computed score
    deltas, rendered verbatim; the signed-in player's row and result are
    highlighted);
  - Rankings (`frontend/src/components/RankingView.tsx`): leaderboards per
    type and season plus the rank card;
  - Friends (`frontend/src/components/FriendList.tsx`): view-only friend list;
  - Settings (`frontend/src/components/SettingsView.tsx`): account data,
    language (English-only for now) and about.
  All query views follow the unified state convention: skeleton loading,
  empty state with the next action, and a one-sentence load error with Retry.
- No match-data write path remains in the Go layer: match reporting,
  virtual-match submission, team management, friend request
  mutations and experience grants have no binding, service, or model in
  this repository. `APIService` exposes only `Get`, `Post` and `Delete`
  (Post serves the auth endpoints and the queue join; Delete serves the
  queue leave — both are the player's own session/queue operations).
- Every page shows a notice that match reporting stays in the maintenance
  panel (MaintenanceView); matchmaking queueing itself is a first-class
  client feature again (author direction: the queue is the player's own
  operation, while reporting stays operational — see the Context note).
- User-visible strings introduced with the read-only views are centralized
  in the i18n catalog `frontend/src/i18n/index.ts` (English-first; the
  `Locale`/`catalogs` shape reserves additional languages). Components read
  strings through `t()` instead of hard-coding them.
- Sessions self-heal on token expiry: authenticated queries go through
  `frontend/src/session.ts::authFetch`, which refreshes via
  `POST /api/auth/refresh` on a 401 and retries once; a failed refresh
  returns the user to the login screen. The read-only surface itself is
  pinned by tests (see 0011).

## Consequences
- Rating-affecting operations require the maintenance panel's credentials;
  a player session token in this client cannot report or mutate match data
  even if a UI regression tried, because no such binding exists. Queueing
  only places the player's own uid into the matchmaking queue.
- Consistent with 0003, the client still never computes ratings: it renders
  server settlement fields (before/delta) from `GET /api/matches/{id}`.
- Friend management actions are not available anywhere in this client; the
  server's friend endpoints are unimplemented anyway (see 0008).

## Evidence
- app.go::GetMyMatches (bound surface is auth + read queries only)
- frontend/wailsjs/go/main/App.d.ts::GetMatch (generated bindings contain no submission function)
- frontend/src/components/MyMatchesView.tsx::MyMatchesView (read-only match history with detail dialog)
- frontend/src/components/HomeView.tsx::READ (read-only notice pointing to the maintenance panel)
- frontend/src/components/FriendList.tsx::GetFriends (view-only friend list)
- internal/services/api.go::Get (APIService exposes only Get/Post; Post used by auth endpoints)
- internal/services/match.go::GetMatch (match service is query-only)
- frontend/src/i18n/index.ts::t (central English-first message catalog)
- Cross-repo (read-only): MatchCoreArena-MaintenanceView hosts the virtual-match submission and matchmaking operation surfaces
