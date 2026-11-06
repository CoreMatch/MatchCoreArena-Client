# 0012. Match Handoff Sender (INTEROP-SPEC v1)

## Status
Accepted

## Context
After a queued match settles, the player must get into the game server. The
receiver side (SamuelClient) implements the MatchCore ↔ SamuelClient match
handoff protocol (`/home/lnb/Desktop/HA/INTEROP-SPEC.md`, v1, Linux-first):
a loopback-only, token-authenticated channel plus a credential-free
`matchcore://join` deep link. This client is the sender.

## Decision
- The sender lives in `internal/interop` (Go) plus the handoff panel in
  `frontend/src/components/PlayView.tsx`. It starts automatically when a
  queue cycle reaches the settled state and never carries credentials:
  the payload contains only `match_id`, `mode`, `map_name` and the
  player-configured `join_target` (host/port) — INTEROP-SPEC §5's
  credential firewall is enforced by construction (no token fields exist
  in the payload types).
- On startup the client publishes `$XDG_RUNTIME_DIR/matchcore-interop/
  mca-client.json` (fallback `~/.config/matchcore-interop/`), 0700 dir and
  0600 atomic writes, with a fresh per-process 32-byte hex token, and binds
  a loopback listener (`127.0.0.1`, OS-assigned port) serving
  `GET /v1/health` and `GET /v1/handoff/{id}` (served once, then 404 gone).
- Delivery: read `samuel-client.json`, require a live pid and
  `protocol_version == 1`, then `POST /v1/join` with the receiver's token
  (flow A). Without a live receiver, open
  `matchcore://join?handoff_id=…&v=1` via `xdg-open` and retry delivery for
  30 seconds while also serving the receiver's pull (flow B).
- Degradation states surfaced in the Play UI: receiver busy (503), timeout,
  receiver missing/unregistered, protocol version mismatch, missing or
  invalid game-server configuration — each with a readable message, retry,
  and a copyable `host:port` manual-join fallback so the match result is
  never lost. A 3-second TCP dial reports game-server reachability as a
  warning without blocking delivery.
- The join target precedence (server contract v1.6.0): the arena server
  attaches `join_target: {host, port}` to each formed group in
  `GET /api/matchmaking/status` (omitted when unconfigured). The sender
  uses it when present and valid, falls back to the local configuration
  (`game_server_host`/`game_server_port` in
  `~/.matchcorearena/config.json`, editable in Settings as an optional
  fallback), and only then degrades to the manual-join state.

## Consequences
- Platform gaps (INTEROP-SPEC §10): deep-link wake-up and the pid
  liveness check are implemented for Linux; on Windows/macOS the flow
  degrades to the manual-join fallback with a readable message.
- The sender's loopback listener is same-user/same-machine only
  (127.0.0.1 bind, token in a 0600 file); it adds no network surface.
- The handoff adds four bindings (`PrepareHandoff`, `GetHandoffStatus`,
  `GetGameServerConfig`, `SetGameServerConfig`) to the allow-list pinned
  by 0011; they are local IPC/settings, not arena-server writes.

## Evidence
- internal/interop/interop.go::Manager (discovery, listener, payload, delivery state machine)
- internal/interop/interop.go::openDeepLink (xdg-open on Linux; documented gap elsewhere)
- internal/interop/interop.go::validHost (receiver-side host gate mirrored)
- internal/handlers/app.go::PrepareHandoff (bindings into the interop manager)
- frontend/src/components/PlayView.tsx::startHandoff (auto-delivery on settle, manual join fallback)
- frontend/src/components/SettingsView.tsx::saveGameServer (game server address settings)
- internal/interop/interop_test.go::TestPushFlowDelivers (flow A), internal/interop/interop_test.go::TestPullFlowServesOnce (one-time pull), internal/interop/interop_test.go::TestStaleDiscoveryIgnored (dead-pid discovery rejected)
- Cross-repo (read-only): /home/lnb/Desktop/HA/INTEROP-SPEC.md (protocol v1), /home/lnb/Desktop/HA/SamuelClient (receiver implementation, be25fab)
