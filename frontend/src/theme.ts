// Shared visual token system (competitive research 04 §A7).
//
// One source of truth for spacing (4/8/12/16/24), corner radius (8/12), the
// type scale (12/14/16/20/28) and the palette. Dark is the baseline theme;
// light stays available. Every color below is already used by this app or by
// SamuelClient (the receiver app this design language is shared with) — no
// new hues are introduced. Semantic intents get exactly one hue each:
// success/warning/danger/info.

import { createTheme, type Theme } from '@mui/material/styles';

export const tokens = {
  // The only spacing values the UI uses (px). They map onto MUI's default
  // 8px factor (0.5 → 4, 1 → 8, 1.5 → 12, 2 → 16, 3 → 24), which is also
  // SamuelClient's basis, so the factor itself stays untouched.
  spacing: [4, 8, 12, 16, 24] as const,
  radius: { md: 8, lg: 12 },
  fontSize: { xs: 12, sm: 14, md: 16, lg: 20, xl: 28 },
  color: {
    // Surface ladder (SamuelClient dark chrome).
    baseDark: '#1a1d21',
    surfaceDark: '#212529',
    raisedDark: '#282c34',
    // Brand accent of this app (primary CTA only, per research 04 §A7).
    accent: '#e94560',
    accentHover: '#c81e45',
    // Rank metals — data visualization, not semantic state.
    gold: '#ffd700',
    silver: '#c0c0c0',
    bronze: '#cd7f32',
    // Text grays (SamuelClient).
    textMuted: '#9ca3af',
    textFaint: '#6b7280',
    // Semantic hues, one each (SamuelClient green/amber/blue + the app's
    // existing defeat red).
    success: '#4CAF50',
    warning: '#f59e0b',
    danger: '#ef5350',
    info: '#3b82f6',
    white: '#ffffff',
  },
} as const;

export type ThemeMode = 'dark' | 'light';

// Tint for accent-colored chips/badges; derived from the accent hue so it
// reads on both themes.
export const accentTint = {
  backgroundColor: 'rgba(233, 69, 96, 0.16)',
  color: tokens.color.accent,
} as const;

export function buildTheme(mode: ThemeMode): Theme {
  const dark = mode === 'dark';
  return createTheme({
    palette: {
      mode,
      primary: { main: tokens.color.accent },
      secondary: { main: tokens.color.gold },
      success: { main: tokens.color.success },
      warning: { main: tokens.color.warning },
      error: { main: tokens.color.danger },
      info: { main: tokens.color.info },
      background: dark
        ? { default: tokens.color.baseDark, paper: tokens.color.surfaceDark }
        : { default: tokens.color.white, paper: tokens.color.white },
      text: dark
        ? {
            primary: tokens.color.white,
            secondary: tokens.color.textMuted,
            disabled: tokens.color.textFaint,
          }
        : {
            primary: tokens.color.baseDark,
            secondary: tokens.color.textFaint,
            disabled: tokens.color.textMuted,
          },
      divider: dark ? 'rgba(255,255,255,0.12)' : 'rgba(26,29,33,0.12)',
    },
    shape: { borderRadius: tokens.radius.md },
    typography: {
      fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
      h4: { fontSize: tokens.fontSize.xl, fontWeight: 700 },
      h5: { fontSize: tokens.fontSize.xl, fontWeight: 700 },
      h6: { fontSize: tokens.fontSize.lg, fontWeight: 600 },
      subtitle1: { fontSize: tokens.fontSize.md },
      body1: { fontSize: tokens.fontSize.md },
      body2: { fontSize: tokens.fontSize.sm },
      caption: { fontSize: tokens.fontSize.xs },
      overline: { fontSize: tokens.fontSize.xs },
      button: { fontSize: tokens.fontSize.sm, textTransform: 'none' },
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: tokens.radius.lg, backgroundImage: 'none' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: tokens.radius.md, textTransform: 'none' },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: tokens.radius.md },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: tokens.radius.md },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: tokens.radius.lg },
        },
      },
    },
  });
}
