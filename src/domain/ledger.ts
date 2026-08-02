import type { NewTransaction, Subscription, Transaction } from '@/domain/types';
import { generateId } from '@/domain/id';
import { isValidIdentifier, validateNewTransaction } from '@/domain/transaction-validation';
import { decodeStoredTransactions } from '@/domain/backup';
import { decodeStoredSubscriptions } from '@/domain/subscription';

export interface LedgerSnapshot {
  transactions: Transaction[];
  subscriptions: Subscription[];
}

export const LEDGER_STORAGE_KEY = 'aureusLedgerV3';
export const LEGACY_TRANSACTION_STORAGE_KEY = 'transactions';
export const LEGACY_SUBSCRIPTION_STORAGE_KEY = 'subscriptions';
export const MAX_ID_GENERATION_ATTEMPTS = 32;

export interface StorageReader {
  getItem(key: string): string | null;
}

export interface StorageWriter {
  setItem(key: string, value: string): void;
}

export interface HydratedLedger {
  snapshot: LedgerSnapshot;
  source: 'v3' | 'legacy' | 'empty';
  canPersist: boolean;
}

export function addValidatedTransaction(
  current: readonly Transaction[],
  candidate: NewTransaction,
  makeId: () => string = () => generateId('tx'),
): Transaction[] {
  const transaction = validateNewTransaction(candidate);
  return addPrevalidatedTransaction(current, transaction, makeId);
}

/** Pure insertion seam for candidates already validated synchronously by UI actions. */
export function addPrevalidatedTransaction(
  current: readonly Transaction[],
  transaction: NewTransaction,
  makeId: () => string = () => generateId('tx'),
): Transaction[] {
  const ids = new Set(current.map(({ id }) => id));
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    const id = makeId();
    if (!ids.has(id) && isValidIdentifier(id)) return [{ ...transaction, id }, ...current];
  }
  throw new Error(`Gagal membuat ID transaksi valid dan unik setelah ${MAX_ID_GENERATION_ATTEMPTS} percobaan`);
}

export function mergeTransactionsIdempotently(
  current: readonly Transaction[],
  additions: readonly Transaction[],
): Transaction[] {
  const ids = new Set(current.map(({ id }) => id));
  const uniqueAdditions = additions.filter((transaction) => {
    if (ids.has(transaction.id)) return false;
    ids.add(transaction.id);
    return true;
  });
  return uniqueAdditions.length === 0 ? [...current] : [...uniqueAdditions, ...current];
}

export function serializeLedgerSnapshot(snapshot: LedgerSnapshot): string {
  return JSON.stringify({ version: 3, ...snapshot });
}

export function decodeStoredLedgerSnapshot(value: unknown): LedgerSnapshot | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 3) return null;
  const transactions = decodeStoredTransactions(record.transactions);
  const subscriptions = decodeStoredSubscriptions(record.subscriptions);
  return transactions === null || subscriptions === null ? null : { transactions, subscriptions };
}

function safeGetItem(storage: StorageReader, key: string): { ok: true; value: string | null } | { ok: false } {
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch {
    return { ok: false };
  }
}

/** Reads the authoritative v3 snapshot first, then deliberately falls back to legacy mirrors. */
export function hydrateLedger(storage: StorageReader): HydratedLedger {
  const combined = safeGetItem(storage, LEDGER_STORAGE_KEY);
  if (!combined.ok) return { snapshot: { transactions: [], subscriptions: [] }, source: 'empty', canPersist: false };
  if (combined.value !== null) {
    try {
      const decoded = decodeStoredLedgerSnapshot(JSON.parse(combined.value));
      if (decoded) return { snapshot: decoded, source: 'v3', canPersist: true };
    } catch {
      // Preserve malformed v3 and inspect legacy mirrors without writing yet.
    }
  }

  const rawTransactions = safeGetItem(storage, LEGACY_TRANSACTION_STORAGE_KEY);
  const rawSubscriptions = safeGetItem(storage, LEGACY_SUBSCRIPTION_STORAGE_KEY);
  if (!rawTransactions.ok || !rawSubscriptions.ok) {
    return { snapshot: { transactions: [], subscriptions: [] }, source: 'empty', canPersist: false };
  }

  let transactions: Transaction[] = [];
  let subscriptions: Subscription[] = [];
  let canPersist = combined.value === null;
  try {
    if (rawTransactions.value !== null) {
      const decoded = decodeStoredTransactions(JSON.parse(rawTransactions.value));
      if (decoded === null) canPersist = false;
      else transactions = decoded;
    }
  } catch {
    canPersist = false;
  }
  try {
    if (rawSubscriptions.value !== null) {
      const decoded = decodeStoredSubscriptions(JSON.parse(rawSubscriptions.value));
      if (decoded === null) canPersist = false;
      else subscriptions = decoded;
    }
  } catch {
    canPersist = false;
  }

  return {
    snapshot: { transactions, subscriptions },
    source: rawTransactions.value === null && rawSubscriptions.value === null ? 'empty' : 'legacy',
    canPersist,
  };
}

/** Authoritative snapshot is written first; mirrors are attempted only after it succeeds. */
export function persistLedger(storage: StorageWriter, snapshot: LedgerSnapshot): void {
  storage.setItem(LEDGER_STORAGE_KEY, serializeLedgerSnapshot(snapshot));
  storage.setItem(LEGACY_TRANSACTION_STORAGE_KEY, JSON.stringify(snapshot.transactions));
  storage.setItem(LEGACY_SUBSCRIPTION_STORAGE_KEY, JSON.stringify(snapshot.subscriptions));
}
