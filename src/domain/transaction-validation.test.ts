import { describe, expect, it } from 'vitest';
import {
  MAX_TRANSACTION_AMOUNT,
  parsePositiveFiniteAmount,
  normalizeTransactionDate,
  validateAndNormalizeTransaction,
  validateNewTransaction,
} from '@/domain/transaction-validation';

describe('shared transaction validation policy', () => {
  it.each([
    ['100000', 100_000],
    [' 100000 ', 100_000],
    [String(MAX_TRANSACTION_AMOUNT), MAX_TRANSACTION_AMOUNT],
  ])('accepts a completely consumed whole-Rupiah input %s', (input, expected) => {
    expect(parsePositiveFiniteAmount(input)).toBe(expected);
  });

  it.each([
    '', '0', '-1', '0.5', '12.5', '100abc', '1,000', 'Infinity', 'NaN',
    String(MAX_TRANSACTION_AMOUNT + 1),
  ])('rejects invalid manual amount %s', (input) => {
    expect(parsePositiveFiniteAmount(input)).toBeNull();
  });

  it('normalizes semantic strings and canonical instant dates', () => {
    const result = validateAndNormalizeTransaction({
      id: ' tx-1 ',
      type: 'expense',
      amount: 15_000,
      category: ' Makanan ',
      description: ' Nasi ',
      date: '2026-03-15T03:30:00+07:00',
    }, { requireId: true });

    expect(result).toEqual({
      ok: true,
      value: {
        id: 'tx-1',
        type: 'expense',
        amount: 15_000,
        category: 'Makanan',
        description: 'Nasi',
        date: '2026-03-14T20:30:00.000Z',
      },
    });
  });

  it.each([
    { id: '', type: 'expense', amount: 1, category: 'A', description: 'B', date: '2026-03-01T00:00:00Z' },
    { id: '1', type: 'other', amount: 1, category: 'A', description: 'B', date: '2026-03-01T00:00:00Z' },
    { id: '1', type: 'expense', amount: 0, category: 'A', description: 'B', date: '2026-03-01T00:00:00Z' },
    { id: '1', type: 'expense', amount: Number.POSITIVE_INFINITY, category: 'A', description: 'B', date: '2026-03-01T00:00:00Z' },
    { id: '1', type: 'expense', amount: 1, category: ' ', description: 'B', date: '2026-03-01T00:00:00Z' },
    { id: '1', type: 'expense', amount: 1, category: 'A', description: ' ', date: '2026-03-01T00:00:00Z' },
    { id: '1', type: 'expense', amount: 1, category: 'A', description: 'B', date: '2026-02-30' },
  ])('rejects invalid transaction %#', (candidate) => {
    expect(validateAndNormalizeTransaction(candidate, { requireId: true }).ok).toBe(false);
  });

  it('enforces canonical instant year and ISO offset boundaries after normalization', () => {
    expect(normalizeTransactionDate('2026-03-15T10:30:00+07:00')).toBe('2026-03-15T03:30:00.000Z');
    expect(normalizeTransactionDate('2026-03-15T10:30:00+14:00')).toBe('2026-03-14T20:30:00.000Z');
    expect(normalizeTransactionDate('2026-03-15T10:30:00+14:01')).toBeNull();
    expect(normalizeTransactionDate('2026-03-15T10:30:00+15:00')).toBeNull();
    expect(normalizeTransactionDate('2026-03-15T10:30:00-14:30')).toBeNull();
    expect(normalizeTransactionDate('0001-01-01T00:00:00+14:00')).toBeNull();
    expect(normalizeTransactionDate('9999-12-31T23:59:59-14:00')).toBeNull();
    expect(normalizeTransactionDate('0001-01-01T14:00:00+14:00')).toBe('0001-01-01T00:00:00.000Z');
    expect(normalizeTransactionDate('9999-12-31T09:59:59-14:00')).toBe('9999-12-31T23:59:59.000Z');
  });

  it('round-trips every accepted canonical instant', () => {
    const normalized = normalizeTransactionDate('2026-03-15T10:30:00+07:00');
    expect(normalized).not.toBeNull();
    expect(normalizeTransactionDate(normalized!)).toBe(normalized);
  });

  it('applies the same policy to newly created transactions', () => {
    expect(() => validateNewTransaction({
      type: 'expense',
      amount: -10,
      category: 'Tagihan',
      description: 'Listrik',
      date: '2026-03-01T00:00:00.000Z',
    })).toThrow('Rupiah bulat positif');
  });
});
