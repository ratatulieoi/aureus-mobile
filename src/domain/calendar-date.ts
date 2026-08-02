export interface CalendarDateParts {
  year: number;
  month: number;
  day: number;
}

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function daysInCalendarMonth(year: number, month: number): number {
  if (!Number.isInteger(year) || !Number.isInteger(month) || year < 1 || month < 1 || month > 12) {
    return 0;
  }
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseCalendarDateParts(value: string): CalendarDateParts | null {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInCalendarMonth(year, month)) return null;

  return { year, month, day };
}

export function formatCalendarDateParts({ year, month, day }: CalendarDateParts): string {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/** Formats an instant as the user's local calendar date. */
export function formatLocalCalendarDate(date: Date): string {
  return formatCalendarDateParts({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  });
}

/** Parses YYYY-MM-DD by numeric local fields, never through the UTC date-string parser. */
export function parseLocalCalendarDate(value: string): Date | null {
  const parts = parseCalendarDateParts(value);
  if (!parts) return null;

  const date = new Date(0);
  date.setHours(0, 0, 0, 0);
  date.setFullYear(parts.year, parts.month - 1, parts.day);
  return date;
}

/** Combines a calendar input with a local clock time and returns a canonical instant. */
export function calendarDateToLocalInstant(value: string, clock: Date = new Date()): string | null {
  const date = parseLocalCalendarDate(value);
  if (!date || Number.isNaN(clock.getTime())) return null;
  date.setHours(clock.getHours(), clock.getMinutes(), clock.getSeconds(), clock.getMilliseconds());
  const instant = date.toISOString();
  // Local timezone offsets can move year 0001/9999 calendar values outside the
  // supported canonical transaction-instant range.
  if (!/^\d{4}-/.test(instant)) return null;
  const year = Number(instant.slice(0, 4));
  return year >= 1 && year <= 9999 ? instant : null;
}

/** Adds calendar days deterministically without local DST-duration arithmetic. */
export function addCalendarDays(value: string, days: number): string | null {
  const parts = parseCalendarDateParts(value);
  if (!parts || !Number.isSafeInteger(days)) return null;

  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  date.setUTCDate(date.getUTCDate() + days);
  const result = {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
  if (result.year < 1 || result.year > 9999) return null;
  const formatted = formatCalendarDateParts(result);
  return parseCalendarDateParts(formatted) ? formatted : null;
}

export function compareCalendarDates(left: string, right: string): number {
  if (!parseCalendarDateParts(left) || !parseCalendarDateParts(right)) {
    throw new TypeError('Tanggal kalender tidak valid');
  }
  return left.localeCompare(right);
}

/**
 * Migrates a persisted date-like value to a calendar date. Date-only and legacy
 * ISO values retain their lexical YYYY-MM-DD because that is how the old form
 * represented the selected subscription day before converting it to UTC.
 */
export function normalizePersistedCalendarDate(value: string): string | null {
  const prefix = value.slice(0, 10);
  return parseCalendarDateParts(prefix) ? prefix : null;
}

export function formatCalendarDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = new Map(parts.map(({ type, value }) => [type, value]));
  return `${values.get('year')}-${values.get('month')}-${values.get('day')}`;
}
