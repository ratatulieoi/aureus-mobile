import { describe, expect, it } from 'vitest';
import {
  filterTransactionsByPeriod,
  normalizeCategoryFilter,
  normalizeTypeFilter,
  resolveBinaryTransactionType,
} from '@/domain/period';
import type { Transaction } from '@/domain/types';

const transactions: Transaction[] = [
  { id: '1', type: 'income', amount: 100, category: 'Gaji', description: 'Maret', date: '2026-03-01T05:00:00.000Z' },
  { id: '2', type: 'expense', amount: 50, category: 'Tagihan', description: 'April', date: '2026-04-01T05:00:00.000Z' },
];

describe('shared period and stale-filter semantics', () => {
  it('returns every row in all-time mode regardless of selected month', () => {
    expect(filterTransactionsByPeriod(transactions, { isAllTime: true, month: 0, year: 2000 }))
      .toEqual(transactions);
  });

  it('filters by local month/year in monthly mode', () => {
    expect(filterTransactionsByPeriod(transactions, { isAllTime: false, month: 2, year: 2026 }))
      .toEqual([transactions[0]]);
  });

  it('resets unavailable category and general type filters to all', () => {
    expect(normalizeCategoryFilter('Gaji', ['Tagihan'])).toBe('all');
    expect(normalizeCategoryFilter('Tagihan', ['Tagihan'])).toBe('Tagihan');
    expect(normalizeTypeFilter('income', [transactions[1]])).toBe('all');
    expect(normalizeTypeFilter('expense', [transactions[1]])).toBe('expense');
  });

  it('switches a binary ledger filter to the sole available truthful type', () => {
    expect(resolveBinaryTransactionType('income', [transactions[1]])).toBe('expense');
    expect(resolveBinaryTransactionType('expense', [transactions[0]])).toBe('income');
    expect(resolveBinaryTransactionType('income', transactions)).toBe('income');
    expect(resolveBinaryTransactionType('expense', [])).toBe('expense');
  });
});
