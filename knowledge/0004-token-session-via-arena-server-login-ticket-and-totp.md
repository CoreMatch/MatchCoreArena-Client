# 0004. Player Identity Is a Bearer-Token Session Obtained from the Arena Server (login-ticket + Optional TOTP)

## Status
Accepted

## Context
The client must identify the player to the arena server. This repository
contains no credential store, account database, or Minecraft/auth-server
integration of its own; the only identity material that appears anywhere in
the code is an OAuth-style token pair returned by the arena server's
`/api/auth/*` endpoints.

## Decision
Player identity is a bearer-token session established through the arena
server:

1. Login: the frontend calls the Go binding `Login(email, password)`, which
   POSTs `/api/auth/login-ticket`. The response either carries an
   `access_token` directly or `totp_required` + a `login_ticket`.
2. If TOTP is required, `VerifyTOTP(loginTicket, passcode)` POSTs
   `/api/auth/totp-verify` and returns the token pair
   (`access_token`, `refresh_token`, `expires_in`, `token_type`).
3. Token storage is split: the webview keeps both tokens in
   `localStorage` (`access_token`, `refresh_token`), and the Go
   `APIService` keeps only the access token in process memory (`SetToken`),
   attaching it as `Authorization: Bearer` to every subsequent request.
4. On app start/reload, if `localStorage` holds a token the frontend pushes
   it back into the Go layer via `SetToken` before fetching the profile;
   auto-logout happens only on explicit 401/unauthorized errors.
5. Logout calls `POST /api/auth/logout` and clears both localStorage keys.

Cross-repo context (read-only): MatchCoreArena-Server's auth handler is a
transparent proxy to HRPAuth ("前端调 MCA，MCA 透传到 HRPAuth"), and its
middleware verifies the same Bearer token and resolves the player UID from
it. The word "HRPAuth" does not occur anywhere in this client repository —
from the client's point of view the arena server is the only auth counterparty.

## Consequences
- Because the Go-side token is memory-only, the frontend restores it from
  localStorage via `SetToken` on every app start/reload; split storage —
  localStorage is the durable copy, Go memory the working copy.
- Tokens in browser localStorage are readable by any code running in the
  webview; this is a deliberate simplicity trade-off (no OS keychain
  integration exists in the repo). Security posture beyond that: not
  documented in repo.
- `RefreshToken` is bound end-to-end (Go binding + `/api/auth/refresh`) but
  no frontend code calls it, so the "Automatic token refresh" claimed in
  USAGE.md is not implemented — an expired access token ends in a
  401-driven logout. (Gap; intent not documented in repo; see 0006.)
- Observed client/server drift: the client identifies users by UUID strings
  (`models.User.UUID`, `GetUserByUUID` → `GET /api/users/{uuid}`), but the
  server's `GET /api/users/:uid` parses the path parameter as an int64 UID
  (`strconv.ParseInt`) and rejects anything else. Against the current
  server, `GetUserByUUID` fails with an invalid-request error. Whether
  UUID-based lookup is planned on the server is not verified; flagged for
  author confirmation (see 0006).
- Limitation: there is no signup/password-reset flow in the client (the
  "Forgot password?" link is an inert `href="#"`).

## Evidence
- internal/services/auth.go::AuthService (login-ticket, totp-verify, refresh, logout calls)
- internal/models/auth.go::TokenResponse (LoginRequest, TokenResponse, TOTPRequiredResponse, TOTPRequest, RefreshRequest)
- internal/services/api.go::SetToken (in-memory token, SetToken, Bearer header in internal/services/api.go::makeRequest)
- frontend/src/components/LoginView.tsx::handleLogin (login + TOTP flow via bindings)
- frontend/src/App.tsx::SetToken (startup restore: `localStorage.getItem('access_token')` → `SetToken`), frontend/src/App.tsx::unauthorized (logout only on 401/unauthorized), frontend/src/App.tsx::setItem (stores both tokens), frontend/src/App.tsx::removeItem (logout clears storage)
- USAGE.md::Automatic ("Automatic token refresh" claim; not implemented — `RefreshToken` has zero callers in `frontend/src`, verified by search)
- frontend/src/components/LoginView.tsx::href (inert "Forgot password?" link)
- Cross-repo (read-only): /home/lnb/Desktop/HA/MatchCoreArena-Server/api/handler/auth.go::AuthHandler (auth endpoints are a transparent proxy to HRPAuth), /home/lnb/Desktop/HA/MatchCoreArena-Server/api/middleware/auth.go::Auth (Bearer verification, 401/expired codes), /home/lnb/Desktop/HA/MatchCoreArena-Server/api/handler/user.go::GetByUID (`GetByUID` parses `:uid` as int64 — the drift noted above)
