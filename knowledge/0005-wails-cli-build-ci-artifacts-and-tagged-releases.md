# 0005. Build and Distribution: Wails CLI Builds, CI Artifacts, GitHub Releases on Tags

## Status
Accepted

## Date
2026-09-12 (Makefile, CI workflows, Dockerfile and start script all
introduced in initial commit e1f5cd879d3da5e6e18acab811ccf01d35b9d8f8)

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
  main): sets up Go 1.25 + Node 18, runs `go test ./...`, frontend
  typecheck and lint, builds the frontend, installs the Wails CLI and runs
  `wails build`, then uploads `build/bin/` as a workflow artifact.
- Release (`.github/workflows/release.yml`, on `v*` tags): builds with
  `wails build` on ubuntu-latest and publishes
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
- Neither workflow installs WebKitGTK system libraries before `wails
  build`; whether the Linux build step succeeds on the runner is not
  verified from this repository.
- The CI test step is broken at HEAD: `main_test.go` calls `app.Greet(...)`,
  but no `Greet` method exists anywhere in the package (searched), so
  `go test ./...` cannot compile. The stale test was inherited from the
  initial commit. (Static finding; the test run itself was not executed in
  this session.)
- The Docker image runs a GUI (Wails/webview) binary in a headless alpine
  container with no display or WebKit runtime installed; the purpose of the
  containerized path is intent not documented in repo.
- Limitation: builds are tied to the Wails CLI version resolved by
  `go install .../cmd/wails@latest` at build time, so builds are not pinned
  to a specific Wails release.

## Evidence
- Makefile:4-9 (`dev`/`build` targets wrapping `wails dev`/`wails build`)
- wails.json:4-8 (`outputfilename`, `frontend:install`, `frontend:build`)
- start.sh:10-51 (toolchain bootstrap, config seeding, `wails dev`)
- .github/workflows/build.yml:9-54 (Go test, typecheck, lint, frontend build, `wails build`, artifact upload of `build/bin/`)
- .github/workflows/release.yml:1-47 (tag trigger `v*`, ubuntu-latest only, uploads `MatchCoreArenaClient` and `.exe` via softprops/action-gh-release)
- Dockerfile:1-48 (multi-stage build, non-root runtime user, `CMD ["./MatchCoreArenaClient"]`)
- docker-compose.yml:1-12 (container build, host network, config volume)
- main_test.go:14-21 (`TestGreet` calling `app.Greet`) vs app.go:9-133 (no `Greet` method defined; repo-wide search for `Greet` matches only main_test.go)
- Commit e1f5cd879d3da5e6e18acab811ccf01d35b9d8f8 — "feat: initial commit of MatchCoreArena Client" (introduced Makefile, workflows, Dockerfile, start.sh)
