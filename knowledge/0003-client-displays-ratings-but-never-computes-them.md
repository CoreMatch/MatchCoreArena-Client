# 0003. The Client Only Displays Ratings; It Never Computes Them

## Status
Accepted

## Context
The MatchCoreArena ecosystem has a competitive scoring system. Rating
computation (a weighted Elo model) is implemented and documented on the
server side: MatchCoreArena-Server knowledge entry 0001 ("Server-Side
Weighted Elo Rating Applied at Match Report Time", Accepted) states ratings
are computed exclusively inside the server's match-report transaction. The
boundary question is what this client does with scores.

## Decision
This client is a pure consumer/display layer for the rating system:

- Rankings are fetched, never computed: `GET /api/rankings/{type}?limit=&season=`
  and `GET /api/rankings/me?type=&season=`, returning server-computed
  `score` and `rank_position` fields that the UI renders as-is.
- The user profile shows `rank_score`, `level` and `experience` exactly as
  returned by `/api/users/me`; no local derivation.
- The client submits no match data at all: it is read-only (see 0010).
  Match reporting (real and virtual) lives outside this repository —
  BedwarsRel-MCA pushes real results and the maintenance panel
  (MaintenanceView) hosts virtual-match submission. The client renders the
  server-computed settlement fields (score before/delta per participant)
  returned by `GET /api/matches/{id}` verbatim.
- Verified absence of rating logic: a case-insensitive search of the whole
  repository for `elo`, `mmr`, `rating`, `glicko`, `trueskill` matches no
  scoring code (only unrelated words such as "Envelope", "developers",
  "WindowReload").

## Consequences
- The client cannot show an updated rating until the server has processed a
  match report; leaderboard freshness is bounded by server-side computation.
- The client holds no mutation surface: the only `POST` calls are the auth
  endpoints (login-ticket, TOTP verify, refresh, logout). All rating-relevant
  writes happen server-side, triggered by BedwarsRel-MCA (real matches,
  `match:report` scope) or the maintenance panel (virtual matches); see 0010.
- Benefit: rating-model changes (K-factor, weights) require no client
  release; the client only needs the response fields to stay stable.
- Limitation: if the server is unreachable, the client has no cached or
  fallback scores — nothing rating-related is stored locally.

## Evidence
- internal/services/ranking.go::GetTopRankings, internal/services/ranking.go::GetMyRanking (GetTopRankings / GetMyRanking are GET-and-parse only)
- internal/models/ranking.go::RankPosition (`Score`, `RankPosition` received from server)
- internal/models/user.go::RankScore (`RankScore`, `Level`, `Experience` fields consumed for display)
- internal/models/match.go::ParticipantDetail (`RankScoreBefore`/`RankScoreDelta` received from server, rendered verbatim)
- frontend/src/components/RankingView.tsx::RankingView (fetch + render), frontend/src/components/RankingView.tsx::rank_position (renders `rank_position`/`score` verbatim)
- frontend/src/components/PlayView.tsx::rank_score (displays `rank_score` from user object)
- frontend/src/components/MyMatchesView.tsx::winnerLabel (renders server settlement fields without arithmetic)
- app.go::GetTopRankings, app.go::GetMatch (ranking/match bindings are read-only queries)
- Repo-wide case-insensitive search for `elo|mmr|rating|glicko|trueskill`: no scoring-logic matches
- Cross-repo (read-only): /home/lnb/Desktop/HA/matchcore/MatchCoreArena-Server/knowledge/0001-server-side-weighted-elo-rating.md (Status Accepted — rating computed server-side) and /home/lnb/Desktop/HA/matchcore/MatchCoreArena-Server/knowledge/0002-match-results-are-pushed-by-bedwarsrel-mca.md (match reports pushed by BedwarsRel-MCA with `match:report` scope)
