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
- Central i18n message catalog (`frontend/src/i18n`): English-first UI
  strings for the new/rewritten views, with a locale interface reserved
  for additional languages

### Changed
- Client is now read-only for all business data: it only performs session
  auth calls and read queries against the MatchCoreArena server
- Friend list is view-only (sending/handling requests is no longer offered)

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

### Fixed
- None

### Security
- Player session tokens can no longer reach rating-mutating endpoints from
  this client, because no such binding exists anymore

## [1.0.0] - 2026-09-12

### Added
- Initial release of MatchCoreArena Client
- Basic authentication flow
- Friend management system
- Ranking visualization
- User profile display