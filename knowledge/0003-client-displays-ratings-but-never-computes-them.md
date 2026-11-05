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
- Match reporting is a raw pass-through: `TeamReportInput` carries observed
  facts (winner/loser teams, alive counts, per-player kills/deaths/survival
  time, a reporter-supplied `perf_tweak`) to `POST /api/matches` without any
  score arithmetic.
- Verified absence of rating logic: a case-insensitive search of the whole
  repository for `elo`, `mmr`, `rating`, `glicko`, `trueskill` matches no
  scoring code (only unrelated words such as "Envelope", "developers",
  "WindowReload").

## Consequences
- The client cannot show an updated rating until the server has processed a
  match report; leaderboard freshness is bounded by server-side computation.
- The `ReportMatchResult` Go binding exists (and is exposed to the
  frontend), but no frontend component calls it — a repo-wide search of
  `frontend/src` finds zero usages of `ReportMatchResult`, `GetMatch`,
  `GetMyMatches`, `CreateTeam`, `AddExperience` and `RefreshToken`. Why
  these bindings exist without UI is intent not documented in repo.
  (Cross-repo note: the server's own knowledge entry 0002 says match results
  are pushed by BedwarsRel-MCA with a scoped `match:report` token, so it is
  not verified that a normal player token could successfully report.)
- Benefit: rating-model changes (K-factor, weights) require no client
  release; the client only needs the response fields to stay stable.
- Limitation: if the server is unreachable, the client has no cached or
  fallback scores — nothing rating-related is stored locally.

## Evidence
- internal/services/ranking.go::GetTopRankings, internal/services/ranking.go::GetMyRanking (GetTopRankings / GetMyRanking are GET-and-parse only)
- internal/models/ranking.go::RankPosition (`Score`, `RankPosition` received from server)
- internal/models/user.go::RankScore (`RankScore`, `Level`, `Experience` fields consumed for display)
- internal/models/match.go::TeamReportInput (`TeamReportInput`/`ParticipantReport`: raw report fields, no score fields computed client-side)
- frontend/src/components/RankingView.tsx::RankingView (fetch + render), frontend/src/components/RankingView.tsx::rank_position (renders `rank_position`/`score` verbatim)
- frontend/src/components/HomeView.tsx::rank_score (displays `rank_score` from user object)
- app.go::GetTopRankings, app.go::ReportMatchResult (ranking/match bindings exposed)
- Repo-wide case-insensitive search for `elo|mmr|rating|glicko|trueskill`: no scoring-logic matches
- Repo-wide search of `frontend/src` for `ReportMatchResult|GetMyMatches|GetMatch|CreateTeam|AddExperience|RefreshToken`: no matches (bindings unused by UI)
- Cross-repo (read-only): /home/lnb/Desktop/HA/MatchCoreArena-Server/knowledge/0001-server-side-weighted-elo-rating.md (Status Accepted — rating computed server-side) and /home/lnb/Desktop/HA/MatchCoreArena-Server/knowledge/0002-match-results-are-pushed-by-bedwarsrel-mca.md (match reports pushed by BedwarsRel-MCA with `match:report` scope)
