import { useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

/**
 * Client-side sorting for small tables (TableSortLabel). `keys` maps each sortable column
 * to the number or text it sorts by.
 */
export function useSortedRows<Row, Key extends string>(
  rows: readonly Row[],
  keys: Record<Key, (row: Row) => number | string>,
  initial: { key: NoInfer<Key>; direction: SortDirection },
) {
  const [sort, setSort] = useState(initial);
  const sorted = useMemo(() => {
    const value = keys[sort.key];
    const factor = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = value(a);
      const right = value(b);
      const order =
        typeof left === 'number' && typeof right === 'number'
          ? left - right
          : String(left).localeCompare(String(right));
      return order * factor;
    });
  }, [rows, keys, sort]);

  /** Clicking the active column flips it; another column starts descending for numbers. */
  const sortBy = (key: Key) =>
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : {
            key,
            direction:
              rows[0] !== undefined && typeof keys[key](rows[0]) === 'number' ? 'desc' : 'asc',
          },
    );
  return { rows: sorted, sort, sortBy };
}
