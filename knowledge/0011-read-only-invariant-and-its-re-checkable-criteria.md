# 0011. Read-Only Invariant and Its Re-Checkable Criteria

## Status
Accepted

## Context
The client is read-only for all MatchCoreArena business data (see 0010).
A regression that reintroduces a write path — a new binding, a direct HTTP
call from the webview, or a stale generated binding referencing a removed
method — would silently break that guarantee. The invariant therefore needs
mechanical enforcement plus a documented way to re-check it.

## Decision
The read-only invariant has three parts, each pinned by a test in
`main_test.go`:

1. **Bound surface allow-list** — `TestAppBoundSurfaceIsReadOnly` reflects
   over `*App` and asserts the exported bound methods are exactly:
   `Login`, `VerifyTOTP`, `RefreshToken`, `Logout`, `SetToken` (session
   auth) and `GetCurrentUser`, `GetFriends`, `GetTopRankings`,
   `GetMyRanking`, `GetMatch`, `GetMyMatches` (read queries). Any added or
   renamed binding fails the test; a write binding can only land by
   consciously editing the allow-list.
2. **No direct network calls in the frontend** —
   `TestFrontendMakesNoDirectNetworkCalls` scans every `.ts`/`.tsx` under
   `frontend/src` for `fetch(`, `axios`, `XMLHttpRequest`, `http://`,
   `https://`. All server traffic must go through the Go bindings.
3. **Binding sync** — `TestWailsBindingsMatchBoundSurface` parses
   `frontend/wailsjs/go/main/App.js` and asserts a bidirectional match with
   the reflected bound methods: no stale binding for a removed method, no
   bound method without a binding (dead surface).

Re-check procedure (from the repository root):

```
go test ./...
```

or targeted:

```
go test -run 'TestAppBoundSurfaceIsReadOnly|TestFrontendMakesNoDirectNetworkCalls|TestWailsBindingsMatchBoundSurface' .
```

## Consequences
- Any future write capability requires: an author decision, an allow-list
  edit, and a knowledge update — the tests make the touch point visible.
- The scan is substring-based; a legitimate future use of one of the
  patterns (e.g. a documentation URL inside `frontend/src`) forces a
  conscious test adjustment rather than slipping through.
- Limitation: the tests pin this repository only; they cannot stop a
  server-side change that repurposes an existing read endpoint.

## Evidence
- main_test.go::TestAppBoundSurfaceIsReadOnly (allow-list of the bound surface)
- main_test.go::TestFrontendMakesNoDirectNetworkCalls (no direct HTTP in frontend/src)
- main_test.go::TestWailsBindingsMatchBoundSurface (generated bindings ↔ bound methods)
- frontend/src/session.ts::authFetch (all authenticated queries go through bindings)
- Cross-reference: 0010 (read-only client decision)
