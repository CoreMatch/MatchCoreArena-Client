# 0010. Read-Only Client: Submission and Matchmaking Moved to MaintenanceView

## Status
Accepted

## Context
The client previously hosted a Virtual Match page that injected single or
batched virtual matches and drove the matchmaking queue (the former entry
0009). Operating surfaces that mutate rating-relevant state belong in an
operational tool rather than a player client, so the submission capability
was relocated to the maintenance panel (MatchCoreArena-MaintenanceView).

## Decision
- The desktop client is read-only for all MatchCoreArena business data.
  The bound surface is limited to session auth plus queries:
  `Login`, `VerifyTOTP`, `RefreshToken`, `Logout`, `SetToken`,
  `GetCurrentUser`, `GetFriends`, `GetTopRankings`,
  `GetMyRanking`, `GetMatch`, `GetMyMatches`. Identity follows the
  server's authoritative numeric uid (`models.User.UID`,
  `models.Ranking.UserUID`); the former UUID-string lookup was removed.
- The read-only query pages are:
  - My Matches (`frontend/src/components/MyMatchesView.tsx`): paginated
    `GET /api/matches/me` list plus per-match detail via `GET /api/matches/{id}`
    (participants and server-computed score deltas, rendered verbatim);
  - Rankings (`frontend/src/components/RankingView.tsx`): leaderboards and
    personal rank per type and season;
  - Friends (`frontend/src/components/FriendList.tsx`): view-only friend list.
- No write path remains in the Go layer: match reporting, virtual-match
  submission, matchmaking join/leave, team management, friend request
  mutations and experience grants have no binding, service, or model in
  this repository. `APIService` exposes only `Get` and `Post` (Post is
  used solely by the auth endpoints).
- Every page that a user might expect submission from shows a notice that
  match submission and matchmaking now live in the maintenance panel
  (MaintenanceView).
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
  a player session token in this client cannot mutate ratings even if a
  UI regression tried, because no binding reaches those endpoints.
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
