import { describe, expect, it } from 'vitest';
import {
  createBackupEnvelope,
  decodeBackup,
  decodeStoredTransactions,
  parseBackupText,
} from '@/domain/backup';
import type { Subscription, Transaction } from '@/domain/types';
import { MAX_SUBSCRIPTION_ID_LENGTH, reconcileSubscriptions } from '@/domain/subscription';
import { validateAndNormalizeTransaction } from '@/domain/transaction-validation';
import { decodeStoredLedgerSnapshot, serializeLedgerSnapshot } from '@/domain/ledger';
import { createDefaultCategoryCatalog } from '@/domain/categories';

const transaction: Transaction = {
  id: 'tx-1',
  type: 'expense',
  amount: 12_500,
  category: 'Tagihan',
  description: 'Listrik',
  date: '2026-03-15T03:00:00.000Z',
};

const subscription: Subscription = {
  id: 'sub-1',
  name: 'Streaming',
  amount: 50_000,
  startDate: '2026-01-01',
  cycleDays: 30,
  nextPaymentDate: '2026-04-01',
  color: 'bg-red-200 text-red-800',
};

describe('localStorage transaction hydration', () => {
  it('preserves valid records and deliberately migrates Hashihan to Tagihan', () => {
    expect(decodeStoredTransactions([{
      ...transaction,
      category: 'Hashihan',
    }])).toEqual([{ ...transaction, category: 'Tagihan' }]);
  });

  it('recovers missing and colliding legacy IDs without contaminating records', () => {
    const ids = ['generated-1', 'generated-2'];
    const hydrated = decodeStoredTransactions([
      transaction,
      { ...transaction, description: 'Air' },
      { ...transaction, id: undefined, description: 'Internet' },
    ], { generateId: () => ids.shift() ?? 'unexpected' });

    expect(hydrated?.map(({ id }) => id)).toEqual(['tx-1', 'generated-1', 'generated-2']);
  });

  it('skips invalid records, including non-positive/non-finite values and bad dates', () => {
    expect(decodeStoredTransactions([
      transaction,
      { ...transaction, id: 'zero', amount: 0 },
      { ...transaction, id: 'negative', amount: -1 },
      { ...transaction, id: 'infinite', amount: Number.POSITIVE_INFINITY },
      { ...transaction, id: 'date', date: 'not-a-date' },
      { ...transaction, id: 'category', category: '' },
    ])).toEqual([transaction]);
  });

  it('signals wrong-shape or malformed JSON to let hydration preserve raw storage', () => {
    expect(decodeStoredTransactions({ transactions: [] })).toBeNull();
    expect(() => JSON.parse('{bad')).toThrow();
  });
});

describe('strict backup decoding', () => {
  it('round-trips the complete current schema', () => {
    const envelope = createBackupEnvelope([transaction], [subscription], new Date('2026-03-15T00:00:00Z'));
    expect(decodeBackup(envelope)).toEqual({
      version: '6.0',
      transactions: [transaction],
      subscriptions: [subscription],
      categories: createDefaultCategoryCatalog(),
      notifications: [],
      notificationPreferences: { enabled: false },
      warning: null,
    });
  });

  it('round-trips persisted custom categories', () => {
    const categories = createDefaultCategoryCatalog();
    categories.income.push('Hadiah');
    const envelope = createBackupEnvelope([transaction], [subscription], categories, new Date('2026-03-15T00:00:00Z'));
    expect(decodeBackup(envelope).categories.income).toContain('Hadiah');
  });

  it('migrates v4 backups with notifications off', () => {
    const decoded = decodeBackup({
      version: '4.0',
      exportDate: '2026-03-15T00:00:00.000Z',
      transactionCount: 1,
      subscriptionCount: 1,
      transactions: [transaction],
      subscriptions: [subscription],
      categories: createDefaultCategoryCatalog(),
    });
    expect(decoded.notifications).toEqual([]);
    expect(decoded.notificationPreferences).toEqual({ enabled: false });
    expect(decoded.warning).toContain('belum menyimpan notifikasi');
  });

  it('supports transaction-only v2 with an explicit destructive warning', () => {
    const decoded = decodeBackup({
      version: '2.0',
      exportDate: '2026-03-15T00:00:00.000Z',
      transactionCount: 1,
      transactions: [transaction],
    });
    expect(decoded.subscriptions).toEqual([]);
    expect(decoded.categories).toEqual(createDefaultCategoryCatalog());
    expect(decoded.warning).toContain('hanya berisi transaksi');
  });

  it.each([
    ['negative amount', { ...transaction, amount: -1 }],
    ['zero amount', { ...transaction, amount: 0 }],
    ['invalid date', { ...transaction, date: '2026-02-30' }],
    ['empty category', { ...transaction, category: ' ' }],
    ['empty description', { ...transaction, description: ' ' }],
    ['empty id', { ...transaction, id: ' ' }],
    ['invalid type', { ...transaction, type: 'other' }],
  ])('rejects the entire backup for %s', (_label, invalid) => {
    const envelope = createBackupEnvelope([transaction], [subscription]);
    expect(() => decodeBackup({ ...envelope, transactions: [transaction, invalid], transactionCount: 2 }))
      .toThrow('Transaksi ke-2');
  });

  it('round-trips a renewal from the maximum accepted subscription ID', () => {
    const maximumIdSubscription = {
      ...subscription,
      id: 's'.repeat(MAX_SUBSCRIPTION_ID_LENGTH),
      nextPaymentDate: '2026-03-15',
    };
    const reconciliation = reconcileSubscriptions([maximumIdSubscription], new Date(2026, 2, 15, 10));
    const renewal = reconciliation.transactions[0];
    expect(renewal.id).toHaveLength(128);
    expect(validateAndNormalizeTransaction(renewal, { requireId: true }).ok).toBe(true);

    const snapshot = { transactions: [renewal], subscriptions: reconciliation.subscriptions, categories: createDefaultCategoryCatalog(), notifications: [], notificationPreferences: { enabled: false } };
    expect(decodeStoredLedgerSnapshot(JSON.parse(serializeLedgerSnapshot(snapshot)))).toEqual(snapshot);
    expect(decodeBackup(createBackupEnvelope(snapshot.transactions, snapshot.subscriptions))).toMatchObject(snapshot);
  });

  it('rejects duplicate transaction and subscription IDs', () => {
    const envelope = createBackupEnvelope([transaction], [subscription]);
    expect(() => decodeBackup({
      ...envelope,
      transactions: [transaction, transaction],
      transactionCount: 2,
    })).toThrow('ID transaksi duplikat');
    expect(() => decodeBackup({
      ...envelope,
      subscriptions: [subscription, subscription],
      subscriptionCount: 2,
    })).toThrow('ID langganan duplikat');
  });

  it('validates version, count, subscription data, depth, JSON, and byte limits', () => {
    const envelope = createBackupEnvelope([transaction], [subscription]);
    expect(() => decodeBackup({ ...envelope, version: '1.0' })).toThrow('Versi backup');
    expect(() => decodeBackup({ ...envelope, exportDate: '2026-02-30T00:00:00.000Z' })).toThrow('instant ISO kanonis');
    expect(() => decodeBackup({ ...envelope, exportDate: '2026-03-15' })).toThrow('instant ISO kanonis');
    expect(() => decodeBackup({ ...envelope, transactionCount: 2 })).toThrow('Jumlah transaksi');
    expect(() => decodeBackup({ ...envelope, subscriptions: [{ ...subscription, cycleDays: 0 }] }))
      .toThrow('Langganan ke-1');
    expect(() => parseBackupText('{bad')).toThrow('bukan JSON');
  });

  it('refuses to export invalid or duplicate current state', () => {
    expect(() => createBackupEnvelope([{ ...transaction, amount: 0 }], [])).toThrow('Transaksi ke-1');
    expect(() => createBackupEnvelope([transaction, transaction], [])).toThrow('ID transaksi duplikat');
    expect(() => createBackupEnvelope([], [{ ...subscription, cycleDays: 0 }])).toThrow('Langganan ke-1');
    expect(() => createBackupEnvelope([], [subscription, subscription])).toThrow('ID langganan duplikat');
  });

  it('does not impose collection or file-size limits on valid backups', () => {
    const manyTransactions = Array.from({ length: 50_001 }, (_, index) => ({ ...transaction, id: `tx-${index}` }));
    const manySubscriptions = Array.from({ length: 5_001 }, (_, index) => ({ ...subscription, id: `sub-${index}` }));
    const manyNotifications = Array.from({ length: 5_001 }, (_, index) => ({
      id: `note-${index}`,
      daysBefore: 3,
      time: '08:00',
      subscriptionIds: [`sub-${index}`],
    }));
    const manyCategories = createDefaultCategoryCatalog();
    manyCategories.expense.push(...Array.from({ length: 201 }, (_, index) => `Kategori ${index}`));
    const envelope = createBackupEnvelope(
      manyTransactions,
      manySubscriptions,
      manyCategories,
      new Date('2026-03-15T00:00:00Z'),
      manyNotifications,
      { enabled: true },
    );
    const text = JSON.stringify(envelope);
    const decoded = parseBackupText(text);

    expect(new Blob([text]).size).toBeGreaterThan(5 * 1024 * 1024);
    expect(decoded.transactions).toHaveLength(50_001);
    expect(decoded.subscriptions).toHaveLength(5_001);
    expect(decoded.categories.expense).toHaveLength(createDefaultCategoryCatalog().expense.length + 201);
    expect(decoded.notifications).toHaveLength(5_001);
  });

  it('still rejects invalid export dates', () => {
    expect(() => createBackupEnvelope([], [], new Date(Number.NaN))).toThrow('Tanggal ekspor');
    const outsideCanonicalRange = new Date(0);
    outsideCanonicalRange.setUTCFullYear(10_000, 0, 1);
    expect(() => createBackupEnvelope([], [], outsideCanonicalRange)).toThrow('instant ISO kanonis');
  });
});
