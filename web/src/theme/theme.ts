import { createTheme, type Theme } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';

// Two Material 3 easings for our own enter/exit motion (docs/design-system.md §4).
declare module '@mui/material/styles' {
  interface Easing {
    emphasizedDecelerate: string;
    emphasizedAccelerate: string;
  }
}

export type ReducedMotion = 'system' | 'always';

/**
 * The app's single MUI theme.
 *
 * `reducedMotion: 'system'` follows the OS "reduce motion" setting; MUI's own default
 * ignores it. Tests pass `'always'` so every transition completes immediately.
 */
export function createAppTheme({
  reducedMotion = 'system',
}: {
  reducedMotion?: ReducedMotion;
} = {}): Theme {
  return createTheme({
    palette: {
      primary: { main: '#2952cc' },
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 8 },
    motion: { reducedMotion },
    transitions: {
      easing: {
        emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
        emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
      },
    },
    components: {
      // 'start' keeps the label visible next to the spinner; the default 'center' hides it.
      MuiButton: { defaultProps: { disableElevation: true, loadingPosition: 'start' } },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiTableCell: { styleOverrides: { root: { fontVariantNumeric: 'tabular-nums' } } },
      MuiDataGrid: {
        defaultProps: { disableRowSelectionOnClick: true },
        styleOverrides: { root: { fontVariantNumeric: 'tabular-nums' } },
      },
    },
  });
}

/** Longest duration allowed for feedback motion (docs/design-system.md §4). */
export const MOTION_CEILING_MS = 375;
