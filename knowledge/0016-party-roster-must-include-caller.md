# 0016. Party Roster Must Include the Caller's Own UUID (Locally Persisted)

## Status
Accepted

## Context
Contract v1.4.0 (and MatchCoreArena-Server knowledge/0012) defines
`party_members` as the complete list of a party's member UUIDs. The server's
`Join` party branch (`joinAsParty`) only resolves that roster; it never
appends the authenticated caller. The earlier Play panel collected only
"other members" and sent them as-is, so the player who clicked "Queue as a
party" was missing from their own party.

The client also has no source for its own Minecraft UUID: `GET /api/users/me`
returns only the numeric uid (MatchCoreArena-Server `internal/service/user.go`)
and the login response carries no `mojang_uuid`. No client-side API can map
the authenticated session to an MC UUID, and the client must not invent one
or change the contract/server.

## Decision
- The Play party panel gains an explicit, controlled "Your Minecraft UUID"
  field, initialized empty and persisted under the localStorage key
  `mca_self_uuid` so the player enters it once. The player may edit or clear
  it at any time.
- On join, the submitted roster is the self UUID first, followed by the
  manually entered other members, de-duplicated (a self UUID typed among the
  other members appears once). UUIDs are normalized and validated as 32 hex
  characters with the existing `normalizeUuid` check.
- Party joins are blocked inside the panel with an i18n message when the self
  UUID is invalid (`partySelfRequired`) or when self plus other members total
  fewer than two players (`partyTooSmall`; the server requires >= 2). Solo
  queueing (no party) keeps its previous behavior.
- No Go binding, server endpoint, or HA-Contract change is required; the fix
  is a UI-side, contract-compatible roster construction.

## Consequences
- The party initiator now actually enters the queue, so a party of N is
  matched as N players instead of N-1.
- The UUID is player-entered local state, not server identity: it can be
  stale or wrong, and the server remains the validator of the roster. The
  client cannot verify that the stored UUID belongs to the signed-in player.
- Clearing the field disables party queueing until a valid UUID is entered
  again; solo queueing is unaffected.

## Evidence
- frontend/src/components/PlayView.tsx::findMatch (self UUID first in the
  roster, de-duplicated, `>= 2` check before the join request)
- frontend/src/components/PlayView.tsx::partySelfUuid (localStorage key
  `mca_self_uuid` initialization and persistence)
- frontend/src/i18n/index.ts::partySelfRequired (`partySelfLabel`,
  `partySelfPlaceholder`, `partyTooSmall`, updated `partyHint`)
- Cross-repo (read-only): MatchCoreArena-Server `internal/service/matchmaking.go::joinAsParty` [xref]
  (resolves the roster; does not add the authenticated caller)
- Cross-repo (read-only): MatchCoreArena-Server `internal/service/user.go`
  (`GET /api/users/me` exposes uid only, hence no client-side UUID source)
- Cross-repo (read-only): MatchCoreArena-Server knowledge/0012 (`party_members`
  is the full member roster)
