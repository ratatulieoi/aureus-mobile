import { describe, expect, it } from 'vitest';
import type { Transaction } from '@/domain/types';
import {
  canSelectDashboardMonth,
  dashboardAvailableYears,
  dashboardPeriodLabel,
  filterTransactionsForDashboard,
} from '@/domain/dashboard-period';

function transaction(id: string, date: Date): Transaction {
  return { id, type: 'expense', amount: 10_000, category: 'Transportasi', description: id, date: date.toISOString() };
}

describe('dashboard period filtering', () => {
  const now = new Date(2026, 0, 10, 12);
  const transactions = [
    transaction('today', new Date(2026, 0, 10, 8)),
    transaction('six-days', new Date(2026, 0, 4, 18)),
    transaction('seven-days', new Date(2026, 0, 3, 18)),
    transaction('previous-month', new Date(2025, 11, 31, 20)),
    transaction('future', new Date(2026, 0, 11, 8)),
  ];

  it('uses inclusive fixed-day quick ranges', () => {
    expect(filterTransactionsForDashboard(transactions, { kind: 'quick', id: 'today' }, now).map(({ id }) => id)).toEqual(['today']);
    expect(filterTransactionsForDashboard(transactions, { kind: 'quick', id: '7d' }, now).map(({ id }) => id)).toEqual(['today', 'six-days']);
    expect(filterTransactionsForDashboard(transactions, { kind: 'quick', id: 'all' }, now).map(({ id }) => id)).toEqual(['today', 'six-days', 'seven-days', 'previous-month']);
  });

  it('filters a calendar month and formats Indonesian labels', () => {
    const period = { kind: 'month' as const, month: 0, year: 2026 };
    expect(filterTransactionsForDashboard(transactions, period, now).map(({ id }) => id)).toEqual(['today', 'six-days', 'seven-days', 'future']);
    expect(dashboardPeriodLabel(period)).toBe('Januari 2026');
  });

  it('limits future months and lists years with data plus the current year', () => {
    expect(canSelectDashboardMonth(0, 2026, now)).toBe(true);
    expect(canSelectDashboardMonth(1, 2026, now)).toBe(false);
    expect(dashboardAvailableYears(transactions, now)).toEqual([2026, 2025]);
  });
});
