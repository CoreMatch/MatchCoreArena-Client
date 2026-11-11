# 0008. Known Broken or Unreachable Calls (Verified Inventory)

## Status
Accepted

## Context
The repository carries call paths that are broken, unverified, or surface
server-side unimplemented features. This entry inventories them as verified
facts; decisions about fixing or removing them remain with the author
(see 0006). Former items (the UUID-vs-UID drift, the unwired token refresh,
UI-less bindings) were resolved by the read-only refactor and are no longer
listed.

## Decision
Record the following verified inventory:

1. **Release Windows artifact build path is verified out-of-CI.** The release
   workflow cross-compiles the Windows binary (`gcc-mingw-w64-x86-64` +
   `wails build -platform windows/amd64`). The workflow itself only runs on
   `v*` tags, but on 2026-11-12 the exact release steps were reproduced in a
   disposable container (node:22-bookworm + Go 1.26 + mingw): `go mod tidy`
   stayed clean, `npm ci` + frontend build succeeded, and `wails build
   -platform windows/amd64` produced `build/bin/MatchCoreArenaClient.exe`
   (PE32+ GUI executable, x86-64). Remaining caveat: the binary is unsigned;
   code-signing would need a certificate the project does not have, and the
   tag-triggered workflow run still has not executed.
2. **Friend endpoints answer `501 mca_not_implemented`.** The server's
   friend feature is explicitly unimplemented (author decision;
   MatchCoreArena-Server knowledge 0010), so the read-only FriendList UI
   receives a typed 501 error envelope instead of data. The UI surfaces the
   error; no fake friend data is returned.

## Consequences
- Item 1 means the Windows cross-compile is known-good out-of-CI; the
  tag-triggered release run itself still has not executed (and the artifact
  stays unsigned).
- Item 2 means the friend list shows an error until the server implements
  the feature; this is intentional (no fake successes).
- Costs/limitations: fixing either item depends on external factors (a tag
  run; the server implementing friends). This entry only records facts; it
  prescribes no fix.

## Evidence
- .github/workflows/release.yml::windows (mingw install + `wails build -platform windows/amd64` steps), .github/workflows/release.yml::tags (workflow triggers only on `v*` tags)
- frontend/src/components/FriendList.tsx::GetFriends (friend UI is view-only)
- Cross-reference: 0006 (pending author decisions), 0010 (read-only refactor), 0011 (read-only invariant)
- Cross-repo (read-only): /home/lnb/Desktop/HA/matchcore/MatchCoreArena-Server/knowledge/0010-friend-and-team-endpoints-are-explicitly-unimplemented.md (friend/team endpoints answer 501 mca_not_implemented)
