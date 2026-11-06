# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial release
- User authentication with email/password
- TOTP two-factor authentication
- Friend system with friend requests
- Rankings leaderboard
- User profile with level and experience
- Cross-platform desktop application using Wails
- React/TypeScript frontend with Material UI
- Go backend with Wails integration
- My Matches view: paginated read-only match history with per-match detail
  (participants and server-computed score deltas)
- Read-only notices pointing match submission and matchmaking to the
  maintenance panel (MatchCoreArena-MaintenanceView)
- Go tests for the read-only API services (httptest-based)
- Read-only invariant tests pinning the bound surface, the absence of
  direct frontend network calls, and generated-binding sync (knowledge
  0011 documents the re-check procedure)
- Central i18n message catalog (`frontend/src/i18n`): English-first UI
  strings for the new/rewritten views, with a locale interface reserved
  for additional languages
- Play page: matchmaking queue cycle (idle → queued → found → in-match →
  settled) driven by `/api/matchmaking/status` polling, party join via
  `party_members` UUID roster, wait timer, cancel, settled match id with a
  deep link into Career detail, plus the player summary, rank card and
  recent matches
- Rank card (A4): score, absolute rank, "Top X%" positioning when the
  ranked population is known, wins and season; "Unranked" empty state
- Settings page: account data, language (English source language) and about

### Changed
- Client is now read-only for all business data: it only performs session
  auth calls and read queries against the MatchCoreArena server
- Friend list is view-only (sending/handling requests is no longer offered)
- Identity follows the server's authoritative numeric uid: `User.uid`
  (incl. `wins_count`) and `Ranking.user_uid`; the rankings board renders
  `Player #{uid}`
- Automatic token refresh: authenticated queries that hit a 401 refresh via
  `/api/auth/refresh` and retry once; a failed refresh returns to the login
  screen
- Release workflow cross-compiles the Windows binary
  (`wails build -platform windows/amd64` with mingw), unsigned
- Navigation: "My Matches" renamed to **Career**; the match list is
  time-first and drops the low-value ID column (rows open the detail)
- Sidebar converged to five entries (Play / Career / Rankings / Friends /
  Settings); the former Home page is merged into Play
- Matchmaking queue operations (join/leave/status) are client bindings
  again; the bound-surface allow-list now permits queue operations while
  still forbidding match reporting and match-data writes
- `GetMyRanking` maps the server's missing-row envelope to an empty result
  (Unranked) instead of a hard error
- Career match detail aligns with the report fields: Player / Team / Result
  / Kills / Deaths / Survived / Score, with the signed-in player's row
  highlighted and their Victory/Defeat result plus points change shown in
  the header
- Unified empty/error/loading states across Career, Rankings and Friends:
  skeleton loading, "nothing here yet + next action" empty states, and a
  one-sentence load error with a Retry action; login/TOTP failures show
  standardized English messages with the raw server detail as a caption

### Deprecated
- None

### Removed
- Virtual Match navigation page (single submission, batch injection,
  matchmaking panel) — moved to the maintenance panel
  (MatchCoreArena-MaintenanceView)
- Write-side bindings and services: match reporting, virtual-match
  submission, matchmaking join/leave/status, team management, friend
  request mutations, experience grants
- `APIService` methods without remaining consumers (Put/Delete/PostWithToken)
- Broken `GetUserByUUID` binding/service (sent a UUID string to the
  server's int64-uid route; no UI consumer on the read-only surface)

### Fixed
- Rankings board no longer displays fields the server never returns
  (`username`/`level` removed; stale `user_uuid` replaced by `user_uid`)
- Unprovisioned profiles and missing personal rankings render as empty
  states instead of errors

### Security
- Player session tokens can no longer reach rating-mutating endpoints from
  this client, because no such binding exists anymore; the read-only
  surface is pinned by tests (see knowledge 0011)

## [1.0.0] - 2026-09-12

### Added
- Initial release of MatchCoreArena Client
- Basic authentication flow
- Friend management system
- Ranking visualization
- User profile display