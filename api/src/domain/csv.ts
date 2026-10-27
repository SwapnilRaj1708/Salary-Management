/** A number written exactly as given, such as "90000.00": raw in the CSV, never prefixed. */
export type Decimal = { readonly decimal: string };

const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;

export function decimal(text: string): Decimal {
  if (!PLAIN_NUMBER.test(text)) throw new Error(`"${text}" is not a plain decimal number`);
  return { decimal: text };
}

export type Cell = string | number | Decimal | null;

// OWASP CSV injection: a spreadsheet treats text starting with these as a formula.
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

function cell(value: Cell): string {
  if (value === null) return '';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') return value.decimal;
  const text = FORMULA_START.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/**
 * RFC 4180 CSV with CRLF line ends. Text cells that a spreadsheet would run as a formula
 * get a leading apostrophe; numbers and decimals stay raw so they can be summed (X5).
 */
export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  return [header, ...rows].map((row) => `${row.map(cell).join(',')}\r\n`).join('');
}
