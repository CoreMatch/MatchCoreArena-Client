# 0001. Wails v2 Desktop App: Go Binding Layer Plus Embedded React Frontend

## Status
Accepted

## Context
MatchCoreArena-Client is the player-facing desktop client of the CoreMatch
MatchCoreArena system. It needs to run as a cross-platform desktop
application while reusing web UI skills (React/TypeScript) and keeping a Go
process that can talk to the arena server over HTTP.

## Decision
The application is built with Wails v2:

- One Go module (`module MatchCoreArena-Client`, Go 1.26) whose only direct
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
  bindings under `frontend/wailsjs/go/main/App.{js,d.ts}` (12 bound
  functions: session auth plus read-only queries, e.g. `Login`,
  `GetTopRankings`, `GetMyMatches`, `SetToken`; see 0010).
- Linux builds target WebKitGTK 2.41 (`"build:tags": "webkit2_41"` in
  wails.json).

## Consequences
- Distribution is a single native binary with the UI embedded; there is no
  separately deployed web frontend.
- The Go layer holds runtime state (e.g. the API token) in process memory,
  while the webview can be reloaded; the frontend therefore restores the
  session token into the Go layer on startup to keep the two in sync (see
  entry 0004).
- Any new capability needs a Go method plus regenerated bindings before the
  frontend can use it.
- Limitation: on Linux the app depends on system WebKitGTK 2.41+ at build
  and runtime.

## Evidence
- wails.json (field: build:tags) (project name, npm install/build steps, `webkit2_41` build tag)
- go.mod (field: module) (module name, Go 1.26.10, direct dep `wails/v2 v2.15.0`)
- main.go::assets (`//go:embed all:frontend/dist`, `wails.Run` with `Bind: []interface{}{app}`)
- app.go::App (all bound methods: auth, user, friend, ranking, match — read-only queries plus session auth)
- internal/handlers/app.go::AppHandler (AppHandler composing config + per-domain services)
- frontend/package.json (field: @mui/material) (React ^19.1.0, @mui/material ^9.0.1, TypeScript ^5.5.0, Vite ^6.3.5)
- frontend/wailsjs/go/main/App.d.ts::Login (generated binding surface)
- README.md::Wails (tech-stack table)
