/**
 * View-transition types for TanStack Router: only a change of page animates. Filter,
 * paging and search changes keep the path, so they swap instantly (design-system §4).
 */
export function pageTransitionTypes({ pathChanged }: { pathChanged: boolean }): string[] | false {
  return pathChanged ? ['page'] : false;
}
