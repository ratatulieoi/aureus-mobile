import type { AppNotification, CategoryCatalog, NewTransaction, NotificationPreferences, Subscription, Transaction } from '@/domain/types';
import { generateId } from '@/domain/id';
import { isValidIdentifier, validateNewTransaction } from '@/domain/transaction-validation';
import { decodeStoredTransactions } from '@/domain/backup';
import { decodeStoredSubscriptions } from '@/domain/subscription';
import { createDefaultCategoryCatalog, validateCategoryCatalog } from '@/domain/categories';
import { decodeNotificationPreferences, decodeStoredNotifications, DEFAULT_NOTIFICATION_PREFERENCES, migrateLegacyNotifications } from '@/domain/notification';

export interface LedgerSnapshot {
  transactions: Transaction[];
  subscriptions: Subscription[];
  categories: CategoryCatalog;
  notifications: AppNotification[];
  notificationPreferences: NotificationPreferences;
}

type LedgerSnapshotInput = Omit<LedgerSnapshot, 'categories' | 'notifications' | 'notificationPreferences'> & {
  categories?: CategoryCatalog;
  notifications?: AppNotification[];
  notificationPreferences?: NotificationPreferences;
};

export const LEDGER_STORAGE_KEY = 'aureusLedgerV6';
export const PREVIOUS_LEDGER_STORAGE_KEY = 'aureusLedgerV5';
export const LEGACY_V4_LEDGER_STORAGE_KEY = 'aureusLedgerV4';
export const LEGACY_V3_LEDGER_STORAGE_KEY = 'aureusLedgerV3';
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
  source: 'v6' | 'v5' | 'v4' | 'v3' | 'legacy' | 'empty';
  canPersist: boolean;
}

export function emptyLedgerSnapshot(): LedgerSnapshot {
  return {
    transactions: [],
    subscriptions: [],
    categories: createDefaultCategoryCatalog(),
    notifications: [],
    notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
  };
}

export function addValidatedTransaction(
  current: readonly Transaction[],
  candidate: NewTransaction,
  makeId: () => string = () => generateId('tx'),
): Transaction[] {
  const transaction = validateNewTransaction(candidate);
  return addPrevalidatedTransaction(current, transaction, makeId);
}

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

export function serializeLedgerSnapshot(snapshot: LedgerSnapshotInput): string {
  return JSON.stringify({
    version: 6,
    ...snapshot,
    categories: snapshot.categories ?? createDefaultCategoryCatalog(),
    notifications: snapshot.notifications ?? [],
    notificationPreferences: snapshot.notificationPreferences ?? DEFAULT_NOTIFICATION_PREFERENCES,
  });
}

export function decodeStoredLedgerSnapshot(value: unknown): LedgerSnapshot | null {
  if (!isRecord(value)) return null;
  if (value.version === 6) {
    const transactions = decodeStoredTransactions(value.transactions);
    const subscriptions = decodeStoredSubscriptions(value.subscriptions);
    const categories = validateCategoryCatalog(value.categories);
    if (transactions === null || subscriptions === null || categories === null) return null;
    const notifications = decodeStoredNotifications(value.notifications, subscriptions);
    const notificationPreferences = decodeNotificationPreferences(value.notificationPreferences);
    return notifications === null || notificationPreferences === null
      ? null
      : { transactions, subscriptions, categories, notifications, notificationPreferences };
  }
  if (value.version === 5) {
    const transactions = decodeStoredTransactions(value.transactions);
    const subscriptions = decodeStoredSubscriptions(value.subscriptions);
    const categories = validateCategoryCatalog(value.categories);
    const notificationPreferences = decodeNotificationPreferences(value.notificationPreferences);
    return transactions === null || subscriptions === null || categories === null || notificationPreferences === null
      ? null
      : { transactions, subscriptions, categories, notifications: migrateLegacyNotifications(value.notifications, subscriptions), notificationPreferences };
  }
  if (value.version === 4) {
    const transactions = decodeStoredTransactions(value.transactions);
    const subscriptions = decodeStoredSubscriptions(value.subscriptions);
    const categories = validateCategoryCatalog(value.categories);
    return transactions === null || subscriptions === null || categories === null
      ? null
      : { transactions, subscriptions, categories, notifications: [], notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES };
  }
  if (value.version === 3) {
    const transactions = decodeStoredTransactions(value.transactions);
    const subscriptions = decodeStoredSubscriptions(value.subscriptions);
    return transactions === null || subscriptions === null
      ? null
      : {
        transactions,
        subscriptions,
        categories: createDefaultCategoryCatalog(),
        notifications: [],
        notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      };
  }
  return null;
}

function safeGetItem(storage: StorageReader, key: string): { ok: true; value: string | null } | { ok: false } {
  try {
    return { ok: true, value: storage.getItem(key) };
  } catch {
    return { ok: false };
  }
}

function decodeJsonSnapshot(value: string, expectedVersion: 3 | 4 | 5 | 6): LedgerSnapshot | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || parsed.version !== expectedVersion) return null;
    return decodeStoredLedgerSnapshot(parsed);
  } catch {
    return null;
  }
}

export function hydrateLedger(storage: StorageReader): HydratedLedger {
  const current = safeGetItem(storage, LEDGER_STORAGE_KEY);
  if (!current.ok) return { snapshot: emptyLedgerSnapshot(), source: 'empty', canPersist: false };
  if (current.value !== null) {
    const decoded = decodeJsonSnapshot(current.value, 6);
    if (decoded) return { snapshot: decoded, source: 'v6', canPersist: true };
  }

  const previous = safeGetItem(storage, PREVIOUS_LEDGER_STORAGE_KEY);
  if (!previous.ok) return { snapshot: emptyLedgerSnapshot(), source: 'empty', canPersist: false };
  if (previous.value !== null) {
    const decoded = decodeJsonSnapshot(previous.value, 5);
    if (decoded) return { snapshot: decoded, source: 'v5', canPersist: current.value === null };
  }

  const legacyV4 = safeGetItem(storage, LEGACY_V4_LEDGER_STORAGE_KEY);
  if (!legacyV4.ok) return { snapshot: emptyLedgerSnapshot(), source: 'empty', canPersist: false };
  if (legacyV4.value !== null) {
    const decoded = decodeJsonSnapshot(legacyV4.value, 4);
    if (decoded) return { snapshot: decoded, source: 'v4', canPersist: current.value === null && previous.value === null };
  }

  const legacyV3 = safeGetItem(storage, LEGACY_V3_LEDGER_STORAGE_KEY);
  if (!legacyV3.ok) return { snapshot: emptyLedgerSnapshot(), source: 'empty', canPersist: false };
  if (legacyV3.value !== null) {
    const decoded = decodeJsonSnapshot(legacyV3.value, 3);
    if (decoded) return { snapshot: decoded, source: 'v3', canPersist: current.value === null && previous.value === null && legacyV4.value === null };
  }

  const rawTransactions = safeGetItem(storage, LEGACY_TRANSACTION_STORAGE_KEY);
  const rawSubscriptions = safeGetItem(storage, LEGACY_SUBSCRIPTION_STORAGE_KEY);
  if (!rawTransactions.ok || !rawSubscriptions.ok) {
    return { snapshot: emptyLedgerSnapshot(), source: 'empty', canPersist: false };
  }

  let transactions: Transaction[] = [];
  let subscriptions: Subscription[] = [];
  let canPersist = current.value === null && previous.value === null && legacyV4.value === null && legacyV3.value === null;
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
    snapshot: {
      transactions,
      subscriptions,
      categories: createDefaultCategoryCatalog(),
      notifications: [],
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
    },
    source: rawTransactions.value === null && rawSubscriptions.value === null ? 'empty' : 'legacy',
    canPersist,
  };
}

export function persistLedger(storage: StorageWriter, snapshot: LedgerSnapshotInput): void {
  storage.setItem(LEDGER_STORAGE_KEY, serializeLedgerSnapshot(snapshot));
  storage.setItem(LEGACY_TRANSACTION_STORAGE_KEY, JSON.stringify(snapshot.transactions));
  storage.setItem(LEGACY_SUBSCRIPTION_STORAGE_KEY, JSON.stringify(snapshot.subscriptions));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
