# Design system

This page describes what the UI is built from and how it should feel and behave. The
reasons behind each choice are in [decisions.md](decisions.md) (D7 for components, D16
for motion).

## 1. Principles

- **Calm and data-first.** The user is an HR manager working through tables and figures.
  Clarity beats decoration.
- **One library.** MUI everywhere gives one look, one theme and one way to style things.
- **Numbers are sacred.** Money is always rendered with `formatMoney`, in tabular figures,
  and is never animated.
- **Every state is designed:** loading, empty, error, saving, and "waking the server".
- **Accessible by default:** keyboard navigation, AA contrast, visible focus, and respect
  for the OS "reduce motion" setting.

## 2. Building blocks

- **Packages.** All free (MIT) packages:
  - `@mui/material`;
  - `@mui/icons-material`, imported by path only (`@mui/icons-material/Search`), because
    the barrel import slows tests down;
  - `@mui/x-data-grid`, `@mui/x-charts` and `@mui/x-date-pickers`, with `dayjs`.
- **No Tailwind.**
  - Layout uses `Stack`, `Grid` and `Box`, with the `sx` prop; `styled()` covers rare
    custom pieces.
  - shadcn/ui is allowed only where it is clearly better and cheap to replace, and each
    use needs its own decision entry. Every shadcn component requires Tailwind, so none
    qualifies in v1.

| Screen | Element | Component |
|---|---|---|
| Shell | App bar and navigation | `AppBar`, `Toolbar`, `Button` wrapped with TanStack Router's `createLink` |
| Shell | Demo notice; background activity | `Alert severity="info"`; `LinearProgress` |
| Login | Form | `Card`, `Stack`, `TextField`, `Button loading` |
| Directory | Grid | `DataGrid` in server mode (`paginationMode`/`sortingMode="server"`, `rowCount` from the API, page sizes 25/50/100, `disableColumnFilter`) |
| Directory | Search; filters | `TextField` with a search icon; `TextField select` for short lists; `Autocomplete` for job titles |
| Directory | Status; export | `Chip`; `Button component="a"` pointing at the export URL |
| Detail | Header; fields; salary history | `Breadcrumbs`, `Chip`, `Card` + `Grid`; `Table size="small"` |
| Forms | Text; lookups; money; dates | `TextField`; `Autocomplete`; `TextField` with `slotProps={{ htmlInput: { inputMode: 'decimal' } }}` and a currency adornment (never `type="number"`). The `inputMode` prop on `TextField` itself lands on the wrapper `div`, not the input *(verified)*.; our `DateInput`, which wraps the X `DatePicker` and passes `YYYY-MM-DD` strings in and out |
| Dialogs | Salary change; mark as left | `Dialog` with `DialogTitle`, `DialogContent` and `DialogActions` |
| Feedback | Toasts; errors | `Snackbar` + `Alert` behind a small `ToastProvider` that shows one at a time; field `helperText`; `Alert` for request errors |
| Insights | KPI tiles; tables | `Card` + `Typography`; `Table` with `TableSortLabel` |
| Insights | Department chart; distribution histogram | X Charts `BarChart`: horizontal for departments; a band axis with `categoryGapRatio: 0` for the histogram |

Not needed: `@mui/lab` (still in beta), `notistack`, Pro features. The free Data Grid
caps page size at 100, which matches our API maximum.

## 3. Theme tokens

Everything comes from one `createAppTheme()` in `web/src/theme/theme.ts`.

| Token | Value | Notes |
|---|---|---|
| Palette | Primary `#2952cc`; MUI's default greys and semantic colours | Light mode only in v1. Dark mode is cheap later with `colorSchemes`. |
| Typography | `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`; buttons not upper-cased | Tables and money use `font-variant-numeric: tabular-nums`, so digits line up |
| Shape | `borderRadius: 8` | |
| Density | `size="small"` text fields; `density="compact"` grid | The app is data-dense |
| Defaults | `MuiButton`: `disableElevation`, `loadingPosition: 'start'`; `MuiDataGrid`: `disableRowSelectionOnClick` | Set once as component default props, not on each use. The default `center` loading position hides a button's label behind the spinner *(verified)*. |

## 4. Motion

Motion explains a change of state. It does not decorate. Everything below comes from
MUI's theme, with no animation library.

### Tokens (`theme.transitions`)

| Name | MUI key | Value | Use |
|---|---|---|---|
| fast | `duration.shortest` | 150 ms | Hover, focus, colour changes |
| base | `duration.shorter` | 200 ms | Page content entering |
| enter / exit | `enteringScreen` / `leavingScreen` | 225 / 195 ms | Dialogs, Fade, Slide (MUI defaults) |
| slow | `duration.standard` | 300 ms | Collapse; chart entry |
| **ceiling** | `duration.complex` | 375 ms | Maximum for any feedback motion |
| standard easing | `easing.easeInOut` | `cubic-bezier(0.4, 0, 0.2, 1)` | Changes in place |
| our enter | `easing.emphasizedDecelerate` (added) | `cubic-bezier(0.05, 0.7, 0.1, 1)` | Page content in (Material 3) |
| our exit | `easing.emphasizedAccelerate` (added) | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Page content out (Material 3) |

The theme also sets `motion: { reducedMotion: 'system' }`.
- MUI's default is `'never'`, which ignores the OS setting.
- With `'system'`, MUI transitions run in 0 ms, the ripple is off, and loaders stop
  animating when the user has asked for reduced motion.
- X Charts follow the OS setting on their own.
- Our own keyframes go inside `@media (prefers-reduced-motion: no-preference)`.

### Where motion is used

| Where | How |
|---|---|
| Page change | View Transitions, through TanStack Router's `defaultViewTransition`. Only navigations that change the path animate: a short fade and an 8 px rise on the main content, while the app bar stays still. Filter, paging and search changes never animate.<br/>Some browsers have View Transitions but not transition types (Chrome/Edge < 125, Safari < 18.2, Firefox < 147). There the router ignores `types` and transitions *every* navigation *(verified in the router source)*. So the global CSS sets `animation: none` on all `::view-transition-*` pseudo-elements, and declares the fade and rise only under `html:active-view-transition-type(page)`, inside `prefers-reduced-motion: no-preference`.<br/>Browsers without View Transitions swap instantly. |
| Directory loading | The previous page stays visible, with the grid's `linear-progress` overlay. The overlay only appears if loading takes longer than 200 ms, so fast responses don't flicker. The first load shows a skeleton. |
| Detail and Insights loading | `Skeleton`, sized like the final content so nothing shifts |
| Saving | `Button loading` (theme default `loadingPosition: 'start'`) with the text "Saving…". The text carries the meaning, not the spinner. |
| Dialogs and toasts | MUI defaults: dialogs fade, snackbars grow |
| New salary-history row | One background-colour fade, from a success tint to transparent over `highlightFadeMs` (1000 ms, exported from `theme.ts`). Colour only, no movement, so it is exempt from the 375 ms ceiling. |
| Charts | X Charts' 300 ms entry animation |
| Waking the server | `ServerWakeGate`: silent for the first 1.5 s. Then an `Alert` with an indeterminate `LinearProgress`, an elapsed-seconds counter and the text "Waking the demo server. Free hosting sleeps after 15 min idle; about a minute. Demo data resets on wake." |

### Never animated

- Money or KPI values: no count-ups. Intermediate frames would show wrong salaries.
- Grid rows on sort, filter or page change: no reordering animation and no staggered lists.
- Layout properties (`height`, `width`, `top`), except inside MUI's `Collapse`.
- Form-error shakes, scroll-linked effects and attention-seeking loops.

### Accessibility and tests

- **Accessibility.**
  - Feedback motion stays at or under 375 ms, and nothing flashes.
  - Progress is never shown by animation alone:
    - buttons say "Saving…";
    - the `Box` wrapping the grid sets `aria-busy={isFetching}`, because the Data Grid
      sets none itself *(verified)*;
    - the grid's loading overlay renders a `role="progressbar"`.
  - The wake banner states its message in text, with `role="status"`.
- **Tests.**
  - Tests render with `createAppTheme({ reducedMotion: 'always' })`. This theme also sets
    `MuiDatePicker.defaultProps.reduceAnimations: true`, because the picker's calendar
    transitions ignore `theme.motion` *(verified)*. Every MUI transition then completes
    immediately, so tests need no sleeps or fake timers.
  - The old `react-transition-group` switch no longer affects MUI 9 *(verified)*.
  - jsdom has no View Transitions and no `matchMedia`, so the router and charts need no
    stubs.
  - Unit tests check that page transitions skip search-only navigations, that
    `reducedMotion` is `'system'`, and that no duration exceeds the ceiling.

## 5. States

| State | Treatment |
|---|---|
| Loading | Described in §4 |
| Empty | The grid's no-rows overlay says "No employees match these filters" and offers a **Clear filters** button. Insights show "No active employees" per section. |
| Error | Field errors under their fields, mapped from problem+json `errors[]`. Other errors show an `Alert` whose wording comes from the error `code`, never a raw message. |
| Signed out | A 401 redirects to `/login`, then back to the page the user came from |
| Server waking | `ServerWakeGate` (§4). Sign-in is disabled until the server answers. After 180 s it offers **Retry**. |

## 6. Size and speed

- **Lazy loading.** The directory (Data Grid) and Insights (charts) routes are
  lazy-loaded. In a probe, everything together was about 425 KB gzip, and React plus MUI
  core about 164 KB.
- **Icons** are imported by path; a Biome rule bans the barrel import.
