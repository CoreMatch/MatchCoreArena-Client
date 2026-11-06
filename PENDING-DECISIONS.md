# Pending Author Decisions

Open design questions for MatchCoreArena-Client that need an author decision.
Each item proceeds with a conservative default until decided. Mirrored by
`knowledge/0006-pending-author-decisions.md`.

## Open

1. **`SERVER_URL` env wiring** — `LoadConfig` reads only
   `~/.matchcorearena/config.json`; no environment variable is read.
   Decision needed: env-over-file vs file-over-env precedence.
   Conservative default until then: config file only (current behavior).
2. **UUID vs UID drift** — the client's `GetUserByUUID` calls
   `GET /api/users/{uuid}`, but the server parses the path parameter as an
   int64 UID, so real UUIDs are rejected. Decision needed: switch the client
   to numeric UID, or add a server-side UUID lookup.
   Conservative default until then: keep the binding as-is (unused by UI).
3. **Token refresh wiring** — the `RefreshToken` binding exists end-to-end
   but the frontend never calls it. Decision needed: wire automatic refresh
   into the UI session flow, or remove the binding.
   Conservative default until then: keep the binding, no auto-refresh.
4. **Release Windows artifact** — `release.yml` uploads
   `MatchCoreArenaClient.exe` but has no Windows build/cross-compile job.
   Decision needed: add a Windows build path or drop the artifact.
   Conservative default until then: workflow unchanged.
5. **Docker image purpose** — the Dockerfile packages a GUI desktop binary
   into a headless alpine image; intended use undocumented.
   Decision needed: document the purpose or remove the image.
   Conservative default until then: keep the Dockerfile unchanged.

## Resolved by the read-only refactor (2026-11-06)

- **UI-less bindings** — write bindings (`ReportMatchResult`,
  `ReportVirtualMatch`, matchmaking, team management, `AddExperience`,
  friend mutations) were removed with the read-only conversion;
  `GetMatch`/`GetMyMatches` got a UI consumer (My Matches view).
- **README feature drift** — the feature list now matches the read-only
  surface.
