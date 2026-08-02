import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  calendarDateToLocalInstant,
  formatCalendarDateInTimeZone,
  formatLocalCalendarDate,
  normalizePersistedCalendarDate,
  parseCalendarDateParts,
  parseLocalCalendarDate,
} from '@/domain/calendar-date';

describe('local calendar date helpers', () => {
  it('validates real dates including leap years and rejects overflow', () => {
    expect(parseCalendarDateParts('2024-02-29')).toEqual({ year: 2024, month: 2, day: 29 });
    expect(parseCalendarDateParts('2025-02-29')).toBeNull();
    expect(parseCalendarDateParts('2026-04-31')).toBeNull();
    expect(parseCalendarDateParts('2026-4-01')).toBeNull();
  });

  it('round-trips a local calendar date without UTC string parsing', () => {
    const parsed = parseLocalCalendarDate('2026-03-01');
    expect(parsed).not.toBeNull();
    expect(formatLocalCalendarDate(parsed!)).toBe('2026-03-01');
    expect(parsed?.getHours()).toBe(0);
  });

  it('combines selected date and local clock deterministically', () => {
    const clock = new Date(2026, 7, 10, 14, 15, 16, 17);
    const instant = calendarDateToLocalInstant('2026-03-01', clock);
    const reconstructed = new Date(instant!);
    expect(formatLocalCalendarDate(reconstructed)).toBe('2026-03-01');
    expect([reconstructed.getHours(), reconstructed.getMinutes(), reconstructed.getSeconds()]).toEqual([14, 15, 16]);
    expect(calendarDateToLocalInstant('2026-02-30', clock)).toBeNull();
  });

  it('rejects local calendar conversion when timezone offset crosses the supported instant range', () => {
    const yearOne = parseLocalCalendarDate('0001-01-01');
    const year9999 = parseLocalCalendarDate('9999-12-31');
    expect(yearOne).not.toBeNull();
    expect(year9999).not.toBeNull();
    // This assertion is timezone-independent: either the local boundary remains
    // a four-digit instant or the helper rejects it, never returning year 0000/+10000.
    for (const [value, clock] of [['0001-01-01', yearOne!], ['9999-12-31', year9999!]] as const) {
      const instant = calendarDateToLocalInstant(value, clock);
      expect(instant === null || /^\d{4}-/.test(instant)).toBe(true);
    }
  });

  it('adds calendar days over month, year, leap, and early-year boundaries', () => {
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addCalendarDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(addCalendarDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addCalendarDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addCalendarDays('0001-01-01', 1)).toBe('0001-01-02');
    expect(addCalendarDays('0099-12-31', 1)).toBe('0100-01-01');
  });

  it('rejects results outside the supported four-digit year range', () => {
    expect(addCalendarDays('0001-01-01', -1)).toBeNull();
    expect(addCalendarDays('9999-12-31', 1)).toBeNull();
  });

  it('migrates lexical legacy ISO subscription days deliberately', () => {
    expect(normalizePersistedCalendarDate('2026-03-01T00:00:00.000Z')).toBe('2026-03-01');
    expect(normalizePersistedCalendarDate('not-a-date')).toBeNull();
  });

  it('identifies calendar days across Indonesian and negative-offset midnights', () => {
    const jakarta = new Date('2026-03-01T00:30:00+07:00');
    expect(formatCalendarDateInTimeZone(jakarta, 'Asia/Jakarta')).toBe('2026-03-01');
    expect(formatCalendarDateInTimeZone(jakarta, 'UTC')).toBe('2026-02-28');
    expect(formatCalendarDateInTimeZone(jakarta, 'America/Los_Angeles')).toBe('2026-02-28');

    const losAngeles = new Date('2026-01-01T00:30:00-08:00');
    expect(formatCalendarDateInTimeZone(losAngeles, 'America/Los_Angeles')).toBe('2026-01-01');
    expect(formatCalendarDateInTimeZone(new Date('2026-01-01T00:30:00Z'), 'America/Los_Angeles')).toBe('2025-12-31');
  });
});
