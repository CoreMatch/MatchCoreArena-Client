# 0004. Player Identity Is a Bearer-Token Session Obtained from the Arena Server (login-ticket + Optional TOTP)

## Status
Accepted

## Date
2026-09-12 (login flow refactored onto Wails bindings in commit
fcec9aa044bc80554691877a09ca49da920d2541); 2026-09-19 (session-token restore
fix in commit 537b39a29cef1ff8df0ede011ed44828f55b8f8e)

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
   it back into the Go layer via `SetToken` before fetching the profile —
   this restore step was added by commit 537b39a ("fix(frontend): restore
   session token and fix auth errors"), which also narrowed auto-logout to
   explicit 401/unauthorized errors only.
5. Logout calls `POST /api/auth/logout` and clears both localStorage keys.

Cross-repo context (read-only): MatchCoreArena-Server's auth handler is a
transparent proxy to HRPAuth ("前端调 MCA，MCA 透传到 HRPAuth"), and its
middleware verifies the same Bearer token and resolves the player UID from
it. The word "HRPAuth" does not occur anywhere in this client repository —
from the client's point of view the arena server is the only auth counterparty.

## Consequences
- Because the Go-side token is memory-only, any webview reload used to lose
  the session until the localStorage→`SetToken` restore was added
  (commit 537b39a). The split-storage design remains: localStorage is the
  durable copy, Go memory the working copy.
- Tokens in browser localStorage are readable by any code running in the
  webview; this is a deliberate simplicity trade-off (no OS keychain
  integration exists in the repo). Security posture beyond that: not
  documented in repo.
- `RefreshToken` is bound end-to-end (Go binding + `/api/auth/refresh`) but
  no frontend code ever calls it, so the "Automatic token refresh" claimed
  in USAGE.md is not implemented at HEAD — an expired access token
  currently ends in a 401-driven logout. (Gap; intent not documented in
  repo.)
- Observed client/server drift: the client identifies users by UUID strings
  (`models.User.UUID`, `GetUserByUUID` → `GET /api/users/{uuid}`), but the
  server's `GET /api/users/:uid` parses the path parameter as an int64 UID
  (`strconv.ParseInt`) and rejects anything else. Against the current
  server, `GetUserByUUID` would fail with an invalid-request error. Whether
  UUID-based lookup is planned on the server is not verified; flagged for
  author confirmation.
- Limitation: there is no signup/password-reset flow in the client (the
  "Forgot password?" link is an inert `href="#"`).

## Evidence
- internal/services/auth.go:17-88 (login-ticket, totp-verify, refresh, logout calls)
- internal/models/auth.go:3-28 (LoginRequest, TokenResponse, TOTPRequiredResponse, TOTPRequest, RefreshRequest)
- internal/services/api.go:15,27-29,49-51 (in-memory token, SetToken, Bearer header)
- frontend/src/components/LoginView.tsx:29-76 (login + TOTP flow via bindings)
- frontend/src/App.tsx:55-68 (startup restore: `localStorage.getItem('access_token')` → `SetToken`), :80-88 (logout only on 401/unauthorized), :92-98 (stores both tokens), :100-112 (logout clears storage)
- Commit 537b39a29cef1ff8df0ede011ed44828f55b8f8e — "fix(frontend): restore session token and fix auth errors" (2026-09-19; message: "pass stored access token to the Go backend on page reload")
- Commit fcec9aa044bc80554691877a09ca49da920d2541 — "feat: refactor login process to use Wails API for authentication and TOTP verification" (diff removes direct `fetch('/api/auth/...')` from LoginView)
- USAGE.md:25-29 ("Automatic token refresh" claim; not implemented at HEAD — `RefreshToken` has zero callers in `frontend/src`, verified by search)
- frontend/src/components/LoginView.tsx:245-258 (inert "Forgot password?" link)
- Cross-repo (read-only): MatchCoreArena-Server api/handler/auth.go:13-57 (auth endpoints are a transparent proxy to HRPAuth), api/middleware/auth.go:23-61 (Bearer verification, 401/expired codes), api/handler/user.go:35-48 (`GetByUID` parses `:uid` as int64 — the drift noted above)
