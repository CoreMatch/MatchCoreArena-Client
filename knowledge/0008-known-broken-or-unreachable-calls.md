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

1. **Release Windows artifact build path is added but unverified.** The
   release workflow now cross-compiles the Windows binary
   (`gcc-mingw-w64-x86-64` + `wails build -platform windows/amd64`), but
   the workflow only runs on `v*` tags, so the step has not executed in CI
   yet (not verified). The binary is unsigned; code-signing would need a
   certificate the project does not have.
2. **Friend endpoints answer `501 mca_not_implemented`.** The server's
   friend feature is explicitly unimplemented (author decision;
   MatchCoreArena-Server knowledge 0010), so the read-only FriendList UI
   receives a typed 501 error envelope instead of data. The UI surfaces the
   error; no fake friend data is returned.

## Consequences
- Item 1 means the Windows artifact cannot be confirmed working until the
  next tag-triggered release run.
- Item 2 means the friend list shows an error until the server implements
  the feature; this is intentional (no fake successes).
- Costs/limitations: fixing either item depends on external factors (a tag
  run; the server implementing friends). This entry only records facts; it
  prescribes no fix.

## Evidence
- .github/workflows/release.yml::windows (mingw install + `wails build -platform windows/amd64` steps), .github/workflows/release.yml::tags (workflow triggers only on `v*` tags)
- frontend/src/components/FriendList.tsx::GetFriends (friend UI is view-only)
- Cross-reference: 0006 (pending author decisions), 0010 (read-only refactor), 0011 (read-only invariant)
- Cross-repo (read-only): /home/lnb/Desktop/HA/MatchCoreArena-Server/knowledge/0010-friend-and-team-endpoints-are-explicitly-unimplemented.md (friend/team endpoints answer 501 mca_not_implemented)
