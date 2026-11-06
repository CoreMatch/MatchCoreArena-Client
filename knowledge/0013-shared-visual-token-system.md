# 0013. Shared Visual Token System (Dark Baseline)

## Status
Accepted

## Context
Competitive UI research (`competitive-ui-research/04-三端可执行建议.md` §A5/A7
and `02-竞技平台对比.md`) recommends a dark, high-density, single-accent look
for arena clients and one consistent set of empty/error/loading states. The
frontend had grown per-view hard-coded colors (`#16213e`, `#0f3460`,
`#66bb6a`, `#8ecdf5`, …) and ad-hoc state presentations, while the receiver
app SamuelClient uses its own dark chrome (`#1a1d21` base, `#212529` surface,
`#4CAF50` green). Two apps in the same ecosystem were drifting apart.

## Decision
- One token source of truth: `frontend/src/theme.ts`. It defines the shared
  values and builds the MUI themes (`buildTheme('dark' | 'light')`).
  - Spacing ladder 4/8/12/16/24 px. It maps onto MUI's default 8px factor
    (0.5/1/1.5/2/3), which is also SamuelClient's basis, so the factor is
    not changed and MUI-internal paddings stay intact.
  - Corner radius 8 (default, `shape.borderRadius`) and 12 (cards, dialogs).
  - Type scale 12/14/16/20/28 px mapped to caption/body2/body1/subtitle1/
    h6/h4-h5; buttons keep sentence case.
  - Dark is the baseline and default theme; light stays available via
    Settings → Appearance (persisted in `localStorage["theme_mode"]`).
- No new hues. Every palette value is taken from SamuelClient's existing
  chrome or from this app's existing colors: surfaces `#1a1d21`/`#212529`,
  text `#ffffff`/`#9ca3af`/`#6b7280`, accent `#e94560`, rank metals
  `#ffd700`/`#c0c0c0`/`#cd7f32`.
- Exactly one hue per semantic intent, shared with SamuelClient:
  success `#4CAF50`, warning `#f59e0b`, danger `#ef5350`, info `#3b82f6`.
  Former one-off greens/reds/ambers (`#4ecca3`, `#66bb6a`, `#ff6b6b`,
  `#ffcc80`, `#a5d6a7`, `#8ecdf5`) are consolidated into these four.
- Unified state components in `frontend/src/components/StateViews.tsx`
  (research 04 §A5): `EmptyState` ("nothing here yet" + next action),
  `ErrorState` (one reason sentence + retry), `LoadingList` (skeletons,
  never bare spinners). All views use them; all read colors from the theme
  so both themes work unchanged.
- The Play queue card renders a phase stepper (In Queue → Match Found →
  In Match → Results In) so the cycle stage is recognizable at a glance.
  Match Found offers explicit exits: copy the server address when the arena
  server attached a `join_target`, and a client-side Dismiss (the formed
  group stays on the server; the copy says so). The automatic handoff still
  triggers only at settlement — delivery timing is unchanged.

## Consequences
- All view files reference theme palette keys (`background.paper`,
  `text.secondary`, `action.hover`, semantic `main`s) instead of literals;
  `theme.ts` and the `#1a1d21` baseline in `index.css` are the only places
  containing color values.
- Adding a color now means justifying it against the token set; semantic
  states must reuse the four hues.
- The light theme is functional but secondary: it reuses the same hues on
  white surfaces and is not separately art-directed.
- Queue state machine, handoff sender behavior and the read-only invariant
  are untouched by this visual pass (frontend-only change).
