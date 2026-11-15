# 0005. Build and Distribution: Wails CLI Builds, CI Artifacts, GitHub Releases on Tags

## Status
Accepted

## Context
The client ships as a desktop binary. The repository needs a reproducible
build path (Go + npm frontend in one artifact) and some distribution
mechanism for players.

## Decision
Everything builds through the Wails CLI:

- Local development/build: `make dev` / `make build` wrap `wails dev` /
  `wails build`; `start.sh` bootstraps toolchain (Go, Node, Wails CLI,
  `npm install`, `go mod tidy`) and runs `wails dev`. `wails.json` defines
  the frontend install/build commands and output filename
  (`MatchCoreArenaClient`).
- CI (`.github/workflows/build.yml`, on push to main/develop and PRs to
  main): sets up Go 1.25 + Node 18, builds the frontend, runs `go test
  ./...`, frontend typecheck and lint, installs the GTK/WebKit build
  dependencies (`libgtk-3-dev`, `libwebkit2gtk-4.1-dev`) and the Wails CLI
  pinned to v2.15.0, runs `wails build`, then uploads `build/bin/` as a
  workflow artifact.
- Release (`.github/workflows/release.yml`, on `v*` tags): builds with
  `wails build` on ubuntu-latest (same frontend-build and GTK/WebKit
  dependency steps, Wails CLI pinned to v2.15.0) and publishes
  `build/bin/MatchCoreArenaClient` and `MatchCoreArenaClient.exe` via
  `softprops/action-gh-release` with generated release notes.
- A multi-stage `Dockerfile` (golang:1.25-alpine builder → alpine runtime,
  non-root user) plus `docker-compose.yml` also exist, building the same
  Wails binary inside a container.

## Consequences
- Distribution is GitHub Releases of self-contained binaries; there is no
  package-manager channel (not verified beyond the workflows).
- The release workflow runs only on ubuntu-latest and has no Windows job or
  cross-compilation step, yet its upload list includes a `.exe` artifact —
  how (or whether) the Windows binary is produced is not verified; as
  written, that file would be missing from the release.
- The Docker image runs a GUI (Wails/webview) binary in a headless alpine
  container with no display or WebKit runtime installed; the purpose of the
  containerized path is intent not documented in repo.
- Limitation: `start.sh` and the Dockerfile install the Wails CLI at
  `@latest`, so local and container builds are not pinned to a specific
  Wails release (the CI workflows pin v2.15.0).

## Evidence
- Makefile::dev (`dev`/`build` targets wrapping `wails dev`/`wails build`)
- wails.json (field: outputfilename) (`outputfilename`, `frontend:install`, `frontend:build`)
- start.sh::wails (toolchain bootstrap, config seeding, `wails dev`)
- .github/workflows/build.yml::wails (frontend build before Go tests, GTK/WebKit dependencies, Wails CLI pinned to v2.15.0, `wails build`, artifact upload of `build/bin/`)
- .github/workflows/release.yml::softprops (tag trigger `v*`, ubuntu-latest only, uploads `MatchCoreArenaClient` and `.exe` via softprops/action-gh-release)
- Dockerfile::MatchCoreArenaClient (multi-stage build, non-root runtime user, `CMD ["./MatchCoreArenaClient"]`)
- docker-compose.yml (field: network_mode) (container build, host network, config volume)
- main_test.go::TestAppCreation (the only Go test: app construction)
