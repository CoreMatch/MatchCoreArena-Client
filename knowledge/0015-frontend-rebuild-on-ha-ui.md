# 0015. Frontend Rebuild on @ha/ui (Tailwind v4 + Radix, Dark Only)

## Status
Accepted (supersedes 0013's MUI theme mechanism; the token values for
semantic hues, spacing, radius and the type ladder carry over)

## Context
The MUI-based UI was judged "cheap-looking, AI-flavored" (author review).
The two HA desktop clients (this one and SamuelClient) also needed one
shared design language. The author approved a ground-up frontend rebuild
with a fixed decision set: Tailwind v4 + Radix primitives, Lucide icons,
locally bundled fonts, MUI fully removed, dark only, near-zero motion,
hard-edged competitive art direction, and a shared package owned by this
workstream.

## Decision
- New shared package `@ha/ui` at `/home/lnb/Desktop/HA/ha-ui` (own local
  git repo, consumed via `file:` dependency — no registry):
  - `src/styles/tokens.css`: `--ha-*` custom properties + Tailwind v4
    `@theme inline` mapping (utility names: `bg-panel`, `text-ink-muted`,
    `border-edge`, `text-hero`, `ease-standard`, ...). Token names are a
    stable contract; README.md documents them.
  - `src/tokens.ts`: JS mirror for raw-value cases.
  - `src/components/`: Radix-based primitives (Button, Panel/Inset, Badge,
    Field/Input, Select, Dialog, Collapsible, Progress, Menu, Banner,
    Skeleton/Spinner, Stat, Stepper, EmptyState/ErrorState, Table, Icon).
  - Consumed as TypeScript source; consumers add `@tailwindcss/vite`,
    `@import "@ha/ui/tokens.css"` and `@source "../node_modules/@ha/ui/src"`.
- Palette: near-black cool ladder `#0a0c10 / #10141a / #171d26`, borders
  `#232b37 / #344152`, text `#e9edf3 / #96a1b3 / #5c6879`, single accent
  `#e94560`; the four semantic hues and rank metals carry over from 0013.
  No shadows; separation is done by 1px borders.
- Dark only: the light theme and the Settings appearance toggle are
  removed (`index.css` pins `color-scheme: dark`).
- Motion: one curve `cubic-bezier(0.4,0,0.2,1)` @ 150ms, used only for
  required state transitions (hover, queue phase color changes, loading
  pulse). No page transitions, no number rolls.
- Fonts: `@fontsource/inter` (UI text) and `@fontsource/jetbrains-mono`
  (numerals, addresses, logs) bundled into the binary — no CDN.
- Single-copy guards: `vite.config.ts` aliases + `resolve.dedupe` and
  `tsconfig` `paths` pin `react`, `react-dom`, `lucide-react` to this
  app's copies, because the file-linked package carries its own
  node_modules (dual React would break hooks).
- Friends view detects the server's typed `501 mca_not_implemented` and
  renders an honest "not implemented yet" state (knowledge 0008 item 2)
  instead of a generic load error.

## Consequences
- `@mui/*`, `@emotion/*`, `frontend/src/theme.ts` and
  `frontend/src/components/StateViews.tsx` are deleted; no `sx` prop
  remains. Bundle shrank (no MUI) and fonts ship as woff2 assets.
- Behavior is unchanged by construction: every view rewrite kept its
  data logic (polling, baselines, handoff auto-start, authFetch, i18n
  catalog) verbatim; the binding allow-list test passes without changes.
- SamuelClient adopts the same `--ha-*` token names via the same package
  (separate workstream); renaming a token is a cross-repo breaking change.
