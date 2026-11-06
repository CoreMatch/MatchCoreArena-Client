# 0014. Consuming Contract v1.7.0 Display Fields (queue stats, self summary, tiers)

## Status
Accepted

## Context
Server commit `52bfb26` (contract v1.7.0) added three read-only,
display-only payloads that unblock UI details the client previously had to
leave blank: how busy the queue is, how "I" did in each listed match, and
whether a rank-tier progress bar can be drawn. See the server's knowledge
0016 for the provider side.

## Decision
- `queue_stats` (`players`, `parties`, `average_wait_seconds`) from
  `GET /api/matchmaking/status` is parsed in `models.MatchmakingStatus`
  and rendered in the Play queue card while queued ("N players · M
  parties · Avg wait ~m:ss"). It is display-only: it never feeds the
  queue state machine (join/leave/found/settled transitions are
  unchanged).
- `self_summary` (own team, win/draw flags, `rank_score_delta`,
  `rank_score_after`) on `/api/matches/me` list items is parsed in
  `models.Match.SelfSummary` (pointer, omitted when absent). Career list
  rows render an own-result badge (Victory/Defeat/Draw) and a colored
  score-change column; rows without it render "—". The detail dialog
  reconciles: participant rows stay primary, `self_summary` is the
  fallback for the own-result chip and the source of the "score after"
  line.
- `GET /api/rankings/tiers` is consumed through a new binding
  `GetRankingTiers` (Go: `services.RankingService.GetRankingTiers`).
  The bound-surface allow-list in `main_test.go` gains exactly this one
  read-only method; the justification required by knowledge 0011 is:
  the endpoint serves display-only configuration (name + min_score),
  performs no write, and needs the player's existing auth like the other
  ranking queries. When the ladder is empty or the call fails, the rank
  card silently keeps its no-progress-bar form — tier thresholds are
  never invented client-side.
- Tier membership is computed client-side from `rank_score` and the
  server ladder (last tier whose `min_score` is reached; progress toward
  the next tier's `min_score`), matching the server's consequence note
  that the server never stores or assigns tiers.

## Consequences
- Frontend contract: `queue_stats` optional-tolerant, `self_summary`
  optional, tiers optional — the UI degrades gracefully against servers
  older than v1.7.0.
- The bound surface now has 20 methods; the allow-list test pins them.
- No change to matchmaking semantics, handoff sender behavior, or the
  read-only invariant.
