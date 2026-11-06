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
   it back into the Go layer via `SetToken` before fetching the profile.
   Authenticated queries go through `authFetch`
   (`frontend/src/session.ts`): a 401 triggers one refresh attempt
   (`POST /api/auth/refresh` with the stored refresh_token) and a retry;
   only when the refresh fails does the app return to the login screen
   (`mca:session-expired` event → logout).
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
- Token refresh is wired end-to-end: `frontend/src/session.ts::authFetch`
  wraps every authenticated binding call, exchanges the stored
  `refresh_token` via the `RefreshToken` binding on a 401 (single-flight
  across concurrent calls), retries the original call once, and signals
  session expiry (logout) when the refresh fails. This matches the server's
  contract: its auth middleware answers 401 `oauth_token_expired` and
  expects the client to call `/api/auth/refresh`.
- Non-auth profile failures are treated as an empty state: a user whose
  `users` row is not provisioned yet (lazy creation at first settlement)
  keeps the session and sees the default profile instead of an error.
- Limitation: there is no signup/password-reset flow in the client (the
  "Forgot password?" link is an inert `href="#"`).

## Evidence
- internal/services/auth.go::AuthService (login-ticket, totp-verify, refresh, logout calls)
- internal/models/auth.go::TokenResponse (LoginRequest, TokenResponse, TOTPRequiredResponse, TOTPRequest, RefreshRequest)
- internal/services/api.go::SetToken (in-memory token, SetToken, Bearer header in internal/services/api.go::makeRequest)
- frontend/src/components/LoginView.tsx::handleLogin (login + TOTP flow via bindings)
- frontend/src/session.ts::authFetch (401 → refresh → retry; session-expired event on refresh failure)
- frontend/src/App.tsx::SetToken (startup restore: `localStorage.getItem('access_token')` → `SetToken`), frontend/src/App.tsx::SESSION_EXPIRED_EVENT (logout on session expiry), frontend/src/App.tsx::setItem (stores both tokens), frontend/src/App.tsx::removeItem (logout clears storage)
- USAGE.md::Authentication (automatic token refresh on expiry)
- frontend/src/components/LoginView.tsx::href (inert "Forgot password?" link)
- Cross-repo (read-only): /home/lnb/Desktop/HA/MatchCoreArena-Server/api/handler/auth.go::AuthHandler (auth endpoints are a transparent proxy to HRPAuth), /home/lnb/Desktop/HA/MatchCoreArena-Server/api/middleware/auth.go::Auth (Bearer verification, 401 oauth_token_expired with the expectation that the client refreshes)
