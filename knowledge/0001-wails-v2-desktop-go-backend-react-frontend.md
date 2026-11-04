# 0001. Wails v2 Desktop App: Go Binding Layer Plus Embedded React Frontend

## Status
Accepted

## Date
2026-09-12 (initial scaffold, commit e1f5cd879d3da5e6e18acab811ccf01d35b9d8f8;
Wails runtime bindings and generated API definitions added the same day in
commit 4fff5f55cd9c7344cedda14a1d8b23093ec82a9b)

## Context
MatchCoreArena-Client is the player-facing desktop client of the CoreMatch
MatchCoreArena system. It needs to run as a cross-platform desktop
application while reusing web UI skills (React/TypeScript) and keeping a Go
process that can talk to the arena server over HTTP.

## Decision
The application is built with Wails v2:

- One Go module (`module MatchCoreArena-Client`, Go 1.25) whose only direct
  requirement is `github.com/wailsapp/wails/v2`.
- The Go side is layered as `internal/config` (config loading),
  `internal/handlers` (one `AppHandler` aggregating per-domain services),
  `internal/services` (HTTP calls to the arena server) and `internal/models`
  (JSON DTOs). `App` (app.go) exposes every handler method so Wails binds
  them to JavaScript.
- The frontend is a React 19 + TypeScript + Vite + Material UI app under
  `frontend/`. `wails.json` wires `npm install` / `npm run build` as the
  frontend steps, and `main.go` embeds the build output with
  `//go:embed all:frontend/dist` and serves it through the Wails asset
  server.
- Frontend↔Go communication happens exclusively through the generated Wails
  bindings under `frontend/wailsjs/go/main/App.{js,d.ts}` (26 bound
  functions, e.g. `Login`, `GetTopRankings`, `SetToken`).
- Linux builds target WebKitGTK 2.41 (`"build:tags": "webkit2_41"` in
  wails.json).

## Consequences
- Distribution is a single native binary with the UI embedded; there is no
  separately deployed web frontend.
- The Go layer holds runtime state (e.g. the API token) in process memory,
  while the webview can be reloaded; keeping the two in sync is a recurring
  failure mode (see entry 0004 for the session-restore fix).
- Any new capability needs a Go method plus regenerated bindings before the
  frontend can use it.
- Cost/limitation (historical): the README tech-stack table had drifted from
  the code — it listed "Gin" as backend framework (go.mod contains no Gin;
  the HTTP layer is plain `net/http`) and "Material UI v6" while
  frontend/package.json pins `@mui/material ^9.0.1`. The README was aligned
  with the code on 2026-11-04 (commit fbc3ade, see 0006); the code, not the
  README, is what was verified.
- Limitation: on Linux the app depends on system WebKitGTK 2.41+ at build
  and runtime.

## Evidence
- wails.json:1-14 (project name, npm install/build steps, `webkit2_41` build tag)
- go.mod:1-5 (module name, Go 1.25.0, direct dep `wails/v2 v2.15.0`)
- main.go:11-31 (`//go:embed all:frontend/dist`, `wails.Run` with `Bind: []interface{}{app}`)
- app.go:28-133 (all bound methods: auth, user, friend, ranking, team, match)
- internal/handlers/app.go:10-36 (AppHandler composing config + per-domain services)
- frontend/package.json:13-35 (React ^19.1.0, @mui/material ^9.0.1, TypeScript ^5.5.0, Vite ^6.3.5)
- frontend/wailsjs/go/main/App.d.ts:5-53 (generated binding surface)
- README.md:16-20 (tech-stack table; aligned with the code on 2026-11-04, commit fbc3ade)
- Commit e1f5cd879d3da5e6e18acab811ccf01d35b9d8f8 — "feat: initial commit of MatchCoreArena Client" (2026-09-12)
- Commit 4fff5f55cd9c7344cedda14a1d8b23093ec82a9b — "feat: Add Wails runtime and API definitions for frontend integration" (2026-09-12)
