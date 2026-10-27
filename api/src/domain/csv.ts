/** A number written exactly as given, such as "90000.00". Not implemented yet. */
export type Decimal = { readonly decimal: string };

export function decimal(_text: string): Decimal {
  throw new Error('Not implemented');
}

export type Cell = string | number | Decimal | null;

/** RFC 4180 CSV. Not implemented yet. */
export function toCsv(_header: readonly string[], _rows: readonly (readonly Cell[])[]): string {
  throw new Error('Not implemented');
}
