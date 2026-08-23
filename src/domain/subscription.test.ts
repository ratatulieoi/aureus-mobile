import { describe, expect, it } from 'vitest';
import {
  areSubscriptionListsEqual,
  decodeStoredSubscriptions,
  MAX_SUBSCRIPTION_ID_LENGTH,
  reconcileSubscriptions,
  validateAndNormalizeSubscription,
} from '@/domain/subscription';
import type { Subscription } from '@/domain/types';

const BASE: Subscription = {
  id: 'sub-1',
  name: 'Streaming',
  amount: 50_000,
  startDate: '2026-01-01',
  cycleDays: 30,
  nextPaymentDate: '2026-03-01',
  color: 'bg-red-200 text-red-800',
};

const NOW = new Date(2026, 2, 15, 10, 0, 0);

describe('subscription validation and hydration', () => {
  it('strictly accepts a normalized subscription', () => {
    expect(validateAndNormalizeSubscription({ ...BASE, name: ' Streaming ' })).toEqual({
      ok: true,
      value: BASE,
    });
  });

  it.each([
    ['blank name', { ...BASE, name: ' ' }],
    ['negative amount', { ...BASE, amount: -1 }],
    ['infinite amount', { ...BASE, amount: Number.POSITIVE_INFINITY }],
    ['zero cycle', { ...BASE, cycleDays: 0 }],
    ['negative cycle', { ...BASE, cycleDays: -1 }],
    ['fractional cycle', { ...BASE, cycleDays: 2.5 }],
    ['invalid start', { ...BASE, startDate: '2026-02-30' }],
    ['invalid next date', { ...BASE, nextPaymentDate: 'not-a-date' }],
    ['backwards schedule', { ...BASE, nextPaymentDate: '2025-12-31' }],
  ])('rejects %s', (_label, value) => {
    expect(validateAndNormalizeSubscription(value).ok).toBe(false);
  });

  it('accepts a free subscription with an Rp0 amount', () => {
    expect(validateAndNormalizeSubscription({ ...BASE, amount: 0 })).toEqual({
      ok: true,
      value: { ...BASE, amount: 0 },
    });
  });

  it('migrates valid legacy ISO date fields and omits corrupt persisted records', () => {
    expect(decodeStoredSubscriptions([
      { ...BASE, nextPaymentDate: '2026-03-01T00:00:00.000Z' },
      { ...BASE, id: 'bad', cycleDays: 0 },
    ])).toEqual([BASE]);
    expect(decodeStoredSubscriptions('{bad')).toBeNull();
  });

  it('caps subscription IDs so lossless renewal IDs fit transaction validation', () => {
    expect(validateAndNormalizeSubscription({ ...BASE, id: 's'.repeat(MAX_SUBSCRIPTION_ID_LENGTH) }).ok).toBe(true);
    expect(validateAndNormalizeSubscription({ ...BASE, id: 's'.repeat(MAX_SUBSCRIPTION_ID_LENGTH + 1) }).ok).toBe(false);
  });

  it('compares normalized subscription lists structurally', () => {
    expect(areSubscriptionListsEqual([BASE], [{ ...BASE }])).toBe(true);
    expect(areSubscriptionListsEqual([BASE], [{ ...BASE, color: 'bg-blue-200 text-blue-800' }])).toBe(false);
    expect(areSubscriptionListsEqual([BASE], [])).toBe(false);
  });
});

describe('bounded idempotent renewal reconciliation', () => {
  it('does nothing before the due calendar day', () => {
    const result = reconcileSubscriptions([{ ...BASE, nextPaymentDate: '2026-03-16' }], NOW);
    expect(result.transactions).toEqual([]);
    expect(result.subscriptions[0].nextPaymentDate).toBe('2026-03-16');
  });

  it('charges a current-day due date once and advances one cycle', () => {
    const result = reconcileSubscriptions([{ ...BASE, nextPaymentDate: '2026-03-15' }], NOW);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0]).toMatchObject({
      id: 'renewal_sub-1_2026-03-15',
      amount: 50_000,
      description: 'Perpanjangan: Streaming',
    });
    expect(new Date(result.transactions[0].date).getHours()).toBe(12);
    expect(result.subscriptions[0].nextPaymentDate).toBe('2026-04-14');
  });

  it('advances a free subscription without creating an Rp0 transaction', () => {
    const free = { ...BASE, amount: 0, nextPaymentDate: '2026-03-15' };
    const result = reconcileSubscriptions([free], NOW);
    expect(result.transactions).toEqual([]);
    expect(result.subscriptions[0].nextPaymentDate).toBe('2026-04-14');
    expect(result.blockedSubscriptionIds).toEqual([]);
  });

  it('preserves every missed charge on its scheduled due date in one pass', () => {
    const result = reconcileSubscriptions([{ ...BASE, nextPaymentDate: '2026-01-01' }], NOW);
    expect(result.transactions.map(({ id }) => id)).toEqual([
      'renewal_sub-1_2026-01-01',
      'renewal_sub-1_2026-01-31',
      'renewal_sub-1_2026-03-02',
    ]);
    expect(result.subscriptions[0].nextPaymentDate).toBe('2026-04-01');
  });

  it('is idempotent after persisting the advanced checkpoint', () => {
    const first = reconcileSubscriptions([BASE], NOW);
    const second = reconcileSubscriptions(first.subscriptions, NOW);
    expect(first.transactions).toHaveLength(1);
    expect(second.transactions).toEqual([]);
  });

  it('quarantines corrupted schedules without emitting transactions', () => {
    const result = reconcileSubscriptions([
      { ...BASE, id: 'zero', cycleDays: 0 },
      { ...BASE, id: 'negative', cycleDays: -1 },
    ], NOW);
    expect(result.transactions).toEqual([]);
    expect(result.subscriptions).toEqual([]);
  });

  it('applies a practical all-or-nothing safety bound', () => {
    const overdue = { ...BASE, cycleDays: 1, startDate: '2020-01-01', nextPaymentDate: '2020-01-01' };
    const result = reconcileSubscriptions([overdue], NOW, 10);
    expect(result.transactions).toEqual([]);
    expect(result.subscriptions).toEqual([overdue]);
    expect(result.blockedSubscriptionIds).toEqual(['sub-1']);
  });

  it('advances over leap and DST calendar boundaries by calendar day', () => {
    const result = reconcileSubscriptions([{ ...BASE, startDate: '2024-02-28', cycleDays: 1, nextPaymentDate: '2024-02-28' }], new Date(2024, 2, 1, 12));
    expect(result.transactions.map(({ id }) => id)).toEqual([
      'renewal_sub-1_2024-02-28',
      'renewal_sub-1_2024-02-29',
      'renewal_sub-1_2024-03-01',
    ]);
    expect(result.subscriptions[0].nextPaymentDate).toBe('2024-03-02');
  });
});
