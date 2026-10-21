/**
 * View-transition types for TanStack Router: only a change from one page to another
 * animates (design-system §4).
 * - Filter, paging and search changes keep the path, so they swap instantly.
 * - The first render (reload or deep link) has no previous location, so it doesn't animate.
 */
export function pageTransitionTypes({
  fromLocation,
  pathChanged,
}: {
  fromLocation?: unknown;
  pathChanged: boolean;
}): string[] | false {
  return fromLocation !== undefined && pathChanged ? ['page'] : false;
}
