export type CsvCell = string | number;
export type CsvRow = readonly CsvCell[];

const FORMULA_PREFIX = /^\s*[=+\-@]/u;

/**
 * Neutralizes spreadsheet formulas by prefixing a single apostrophe. Numeric
 * JavaScript values remain numeric; string fields are treated as untrusted,
 * including leading whitespace and tabs before a formula sigil.
 */
export function neutralizeSpreadsheetFormula(value: string): string {
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

export function escapeCsvCell(cell: CsvCell): string {
  const value = typeof cell === 'number' ? String(cell) : neutralizeSpreadsheetFormula(cell);
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** RFC 4180 field escaping with CRLF record separators. */
export function serializeCsvRows(rows: readonly CsvRow[]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}
