# 0007. Ecosystem Boundary: The Client Talks Only to MatchCoreArena-Server

## Status
Accepted

## Date
2026-09-12 (single-base-url design, see 0002); boundary verified against HEAD on 2026-11-05

## Context
The client sits in the HA ecosystem next to HRPAuth (accounts),
HRPAuth-Yggdrasil-API (Minecraft auth), HASkinLib / HASkinProxy (skins) and
WinnerProxy. Because login ultimately depends on HRPAuth accounts, it is
worth recording explicitly whether the client ever talks to those services
directly.

## Decision
Verified boundary (repository-wide searches on the 2026-11-05 HEAD):

- The client's only network peer is MatchCoreArena-Server, through the one
  configurable `server_url` (see 0002). Zero occurrences of `hrpauth`,
  `yggdrasil`, `winnerproxy`, `skinlib`, or `skinproxy` in Go code,
  frontend sources, or config files.
- HRPAuth is reached only indirectly: the arena server transparently
  proxies the auth endpoints (`/api/auth/login-ticket`, `/api/auth/totp-verify`,
  `/api/auth/refresh`, `/api/auth/logout`), so the client never holds HRPAuth
  credentials or a HRPAuth base URL (see 0004).
- No skin pipeline involvement: profile rendering uses only the data
  returned by the arena server; no skin upload/download endpoints are
  called.
- HA-Contract has no runtime role for this client; the arena REST API is
  defined inside MatchCoreArena-Server (see 0002 consequences).

## Consequences
- The client inherits the server's availability; there is no degraded mode
  (0002).
- Protocol changes in Yggdrasil or the skin services cannot affect the
  client directly; only arena-server API changes can (and those can drift
  silently, see 0008).
- Costs/limitations: the boundary is enforced by absence, not by a stated
  rule; nothing prevents future features from calling other services
  directly. Whether that is intended (e.g. future direct skin downloads) is
  not documented — pending author confirmation.

## Evidence
- Repository-wide case-insensitive search on 2026-11-05 HEAD across `*.go`, `*.ts`, `*.tsx`, `*.json` (excluding node_modules/dist/wailsjs): `hrpauth|yggdrasil|winnerproxy|skinlib|skinproxy` → 0 hits
- internal/services/api.go::APIService (single APIService, single base URL, Bearer header)
- internal/config/config.go::Config (only `server_url` + `debug` are configured)
- Cross-references: 0002 (single base URL), 0004 (auth via the server's transparent proxy)
