# Pending Author Decisions

Open design questions for MatchCoreArena-Client that need an author decision.
Each item proceeds with a conservative default until decided. Mirrored by
`knowledge/0006-pending-author-decisions.md`.

## Open

1. **`SERVER_URL` env wiring** — `LoadConfig` reads only
   `~/.matchcorearena/config.json`; no environment variable is read.
   Decision needed: env-over-file vs file-over-env precedence.
   Conservative default until then: config file only (current behavior).
2. **Docker image purpose** — the Dockerfile packages a GUI desktop binary
   into a headless alpine image; intended use undocumented.
   Decision needed: document the purpose or remove the image.
   Conservative default until then: keep the Dockerfile unchanged.

## Resolved (2026-11-06, read-only client follow-up batch)

- **UUID vs UID drift** — investigated: the client sent a UUID string to
  `GET /api/users/:uid`, which the server parses as an int64 uid
  (`strconv.ParseInt`); the server's authoritative identity is the numeric
  uid resolved from the token. Resolution: the broken `GetUserByUUID`
  binding/service removed (no UI consumer on the read-only surface), and
  the client models unified to the uid basis (`User.uid` incl.
  `wins_count`, `Ranking.user_uid`); RankingView renders `Player #{uid}`.
  "User not found" cases render as empty states: an unprovisioned profile
  keeps the session and shows the default profile; a missing personal
  ranking hides the "Your Ranking" card; an empty match history shows the
  empty list state.
- **Token refresh** — the server's `POST /api/auth/refresh` exists and is
  the designated recovery path (auth middleware answers 401
  `oauth_token_expired` expecting a client refresh). Resolution: wired via
  `frontend/src/session.ts` (`authFetch`): any authenticated query hitting
  a 401 triggers a single-flight refresh with the stored refresh_token and
  one retry; a failed refresh dispatches session expiry and the app returns
  to the login screen.
- **Read-only invariant** — pinned by three tests in `main_test.go`
  (`TestAppBoundSurfaceIsReadOnly`, `TestFrontendMakesNoDirectNetworkCalls`,
  `TestWailsBindingsMatchBoundSurface`); re-check criteria documented in
  knowledge 0011.
- **Release .exe build path** — filled mechanically: `release.yml` now
  installs `gcc-mingw-w64-x86-64` and runs
  `wails build -platform windows/amd64` (documented wails cross-compilation;
  no signing certificate or external credentials involved — the artifact is
  unsigned). Note: the release workflow only runs on `v*` tags, so the step
  is verified only at the next tag-triggered release run (tracked in
  knowledge 0008; local verification was not possible — mingw installation
  requires sudo, which this environment does not grant).
