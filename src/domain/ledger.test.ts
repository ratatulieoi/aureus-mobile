import { describe, expect, it } from 'vitest';
import {
  addPrevalidatedTransaction,
  addValidatedTransaction,
  decodeStoredLedgerSnapshot,
  hydrateLedger,
  LEDGER_STORAGE_KEY,
  LEGACY_SUBSCRIPTION_STORAGE_KEY,
  LEGACY_TRANSACTION_STORAGE_KEY,
  MAX_ID_GENERATION_ATTEMPTS,
  PREVIOUS_LEDGER_STORAGE_KEY,
  mergeTransactionsIdempotently,
  persistLedger,
  serializeLedgerSnapshot,
} from '@/domain/ledger';
import type { NewTransaction, Transaction } from '@/domain/types';
import { createDefaultCategoryCatalog } from '@/domain/categories';

const candidate: NewTransaction = {
  type: 'expense',
  amount: 10_000,
  category: 'Makanan',
  description: 'Nasi',
  date: '2026-03-01T00:00:00.000Z',
};

const renewal: Transaction = { ...candidate, id: 'renewal_sub-1_2026-03-01' };
const snapshot = {
  transactions: [renewal],
  categories: createDefaultCategoryCatalog(),
  subscriptions: [{
    id: 'sub-1', name: 'Streaming', amount: 10_000, startDate: '2026-01-01',
    cycleDays: 30, nextPaymentDate: '2026-03-31', color: 'bg-red-200 text-red-800',
  }],
};

describe('ledger state boundaries', () => {
  it('validates and assigns a shared generated ID', () => {
    expect(addValidatedTransaction([], candidate, () => 'tx-1')).toEqual([{ ...candidate, id: 'tx-1' }]);
    expect(addPrevalidatedTransaction([], candidate, () => 'tx-1')).toEqual([{ ...candidate, id: 'tx-1' }]);
  });

  it('fails explicitly after a bounded run of repeated ID collisions', () => {
    let calls = 0;
    expect(() => addValidatedTransaction(
      [{ ...candidate, id: 'collision' }],
      candidate,
      () => { calls += 1; return 'collision'; },
    )).toThrow(`${MAX_ID_GENERATION_ATTEMPTS} percobaan`);
    expect(calls).toBe(MAX_ID_GENERATION_ATTEMPTS);
  });

  it('deduplicates stable renewal IDs across retry/rerender passes', () => {
    expect(mergeTransactionsIdempotently([renewal], [renewal])).toEqual([renewal]);
  });

  it('round-trips the combined subscription checkpoint and transaction ledger', () => {
    expect(decodeStoredLedgerSnapshot(JSON.parse(serializeLedgerSnapshot(snapshot)))).toEqual(snapshot);
  });

  it('makes getItem SecurityError exception-safe', () => {
    const result = hydrateLedger({ getItem: () => { throw new DOMException('blocked', 'SecurityError'); } });
    expect(result).toEqual({
      snapshot: { transactions: [], subscriptions: [], categories: createDefaultCategoryCatalog() },
      source: 'empty',
      canPersist: false,
    });
  });

  it('prefers a valid authoritative v4 snapshot over stale mirrors', () => {
    const values = new Map<string, string>([
      [LEDGER_STORAGE_KEY, serializeLedgerSnapshot(snapshot)],
      [LEGACY_TRANSACTION_STORAGE_KEY, JSON.stringify([])],
      [LEGACY_SUBSCRIPTION_STORAGE_KEY, JSON.stringify([])],
    ]);
    expect(hydrateLedger({ getItem: (key) => values.get(key) ?? null })).toMatchObject({
      snapshot,
      source: 'v4',
      canPersist: true,
    });
  });

  it('migrates a valid v3 ledger to default categories', () => {
    const legacyV3 = JSON.stringify({ version: 3, transactions: snapshot.transactions, subscriptions: snapshot.subscriptions });
    const values = new Map<string, string>([[PREVIOUS_LEDGER_STORAGE_KEY, legacyV3]]);
    expect(hydrateLedger({ getItem: (key) => values.get(key) ?? null })).toMatchObject({
      source: 'v3',
      canPersist: true,
      snapshot: { transactions: snapshot.transactions, subscriptions: snapshot.subscriptions, categories: createDefaultCategoryCatalog() },
    });
  });

  it('writes v4 first and never updates mirrors if the authoritative write fails', () => {
    const calls: string[] = [];
    expect(() => persistLedger({
      setItem: (key) => {
        calls.push(key);
        if (key === LEDGER_STORAGE_KEY) throw new DOMException('full', 'QuotaExceededError');
      },
    }, snapshot)).toThrow();
    expect(calls).toEqual([LEDGER_STORAGE_KEY]);
  });

  it('writes mirrors in deterministic order only after v3 succeeds', () => {
    const calls: string[] = [];
    persistLedger({ setItem: (key) => { calls.push(key); } }, snapshot);
    expect(calls).toEqual([
      LEDGER_STORAGE_KEY,
      LEGACY_TRANSACTION_STORAGE_KEY,
      LEGACY_SUBSCRIPTION_STORAGE_KEY,
    ]);
  });

  it('preserves malformed legacy data by disabling automatic persistence', () => {
    const values = new Map<string, string>([[LEGACY_TRANSACTION_STORAGE_KEY, '{bad']]);
    expect(hydrateLedger({ getItem: (key) => values.get(key) ?? null }).canPersist).toBe(false);
  });
});
