import type { AppNotification, CategoryCatalog, NotificationPreferences, Subscription, Transaction } from '@/domain/types';
import { generateId } from '@/domain/id';
import { validateAndNormalizeSubscription } from '@/domain/subscription';
import { normalizeTransactionDate, validateAndNormalizeTransaction } from '@/domain/transaction-validation';
import { createDefaultCategoryCatalog, validateCategoryCatalog } from '@/domain/categories';
import { decodeNotificationPreferences, DEFAULT_NOTIFICATION_PREFERENCES, migrateLegacyNotifications, validateAndNormalizeAppNotification } from '@/domain/notification';

export const CURRENT_BACKUP_VERSION = '6.0';
export const PREVIOUS_BACKUP_VERSION = '5.0';
export const CATEGORY_BACKUP_VERSION = '4.0';
export const LEGACY_BACKUP_VERSION = '3.0';
export const TRANSACTION_ONLY_BACKUP_VERSION = '2.0';

export interface TransactionDecodeOptions {
  generateId?: () => string;
}

export interface BackupEnvelope {
  version: typeof CURRENT_BACKUP_VERSION;
  exportDate: string;
  transactionCount: number;
  subscriptionCount: number;
  transactions: Transaction[];
  subscriptions: Subscription[];
  categories: CategoryCatalog;
  notificationCount: number;
  notifications: AppNotification[];
  notificationPreferences: NotificationPreferences;
}

export interface DecodedBackup {
  version: typeof CURRENT_BACKUP_VERSION | typeof PREVIOUS_BACKUP_VERSION | typeof CATEGORY_BACKUP_VERSION | typeof LEGACY_BACKUP_VERSION | typeof TRANSACTION_ONLY_BACKUP_VERSION;
  transactions: Transaction[];
  subscriptions: Subscription[];
  categories: CategoryCatalog;
  notifications: AppNotification[];
  notificationPreferences: NotificationPreferences;
  warning: string | null;
}

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createBackupEnvelope(
  transactions: readonly Transaction[],
  subscriptions: readonly Subscription[],
  categoriesOrNow: CategoryCatalog | Date = createDefaultCategoryCatalog(),
  explicitNow = new Date(),
  notifications: readonly AppNotification[] = [],
  notificationPreferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES,
): BackupEnvelope {
  const categories = categoriesOrNow instanceof Date ? createDefaultCategoryCatalog() : categoriesOrNow;
  const now = categoriesOrNow instanceof Date ? categoriesOrNow : explicitNow;
  const normalizedCategories = validateCategoryCatalog(categories);
  if (!normalizedCategories) throw new BackupValidationError('Daftar kategori tidak valid');
  if (Number.isNaN(now.getTime())) throw new BackupValidationError('Tanggal ekspor backup tidak valid');
  const exportDate = now.toISOString();
  if (normalizeTransactionDate(exportDate) !== exportDate) {
    throw new BackupValidationError('Tanggal ekspor berada di luar rentang instant ISO kanonis');
  }

  // Decode the proposed envelope through the exact strict restore policy. This
  // prevents exporting invalid records, duplicates, or any future schema drift.
  const proposed: BackupEnvelope = {
    version: CURRENT_BACKUP_VERSION,
    exportDate,
    transactionCount: transactions.length,
    subscriptionCount: subscriptions.length,
    transactions: [...transactions],
    subscriptions: [...subscriptions],
    categories: normalizedCategories,
    notificationCount: notifications.length,
    notifications: [...notifications],
    notificationPreferences,
  };
  const decoded = decodeBackup(proposed);
  return {
    ...proposed,
    transactions: decoded.transactions,
    subscriptions: decoded.subscriptions,
    categories: decoded.categories,
    notifications: decoded.notifications,
    notificationPreferences: decoded.notificationPreferences,
  };
}

/**
 * Hydration is record-recovering but never invents financial values. Invalid
 * records are skipped, legacy Hashihan is migrated, and missing/duplicate IDs
 * receive new IDs so one deletion cannot remove unrelated records.
 */
export function decodeStoredTransactions(
  value: unknown,
  options: TransactionDecodeOptions = {},
): Transaction[] | null {
  if (!Array.isArray(value)) return null;

  const makeId = options.generateId ?? (() => generateId('tx'));
  const transactions: Transaction[] = [];
  const ids = new Set<string>();

  for (const candidate of value) {
    if (!isRecord(candidate)) continue;
    const candidateId = typeof candidate.id === 'string' ? candidate.id.trim() : '';
    let id = candidateId && !ids.has(candidateId) ? candidateId : makeId();
    if (ids.has(id)) id = makeId();
    const result = validateAndNormalizeTransaction(
      { ...candidate, id },
      { requireId: true, allowCalendarDate: true, migrateLegacyCategory: true },
    );
    if (!result.ok || ids.has(result.value.id)) continue;
    ids.add(result.value.id);
    transactions.push(result.value);
  }

  return transactions;
}

function decodeStrictTransactions(value: unknown, expectedCount: unknown): Transaction[] {
  if (!Array.isArray(value)) throw new BackupValidationError('Daftar transaksi backup tidak valid');
  if (!Number.isSafeInteger(expectedCount) || expectedCount !== value.length) {
    throw new BackupValidationError('Jumlah transaksi backup tidak sesuai dengan isinya');
  }

  const ids = new Set<string>();
  return value.map((candidate, index) => {
    const result = validateAndNormalizeTransaction(candidate, { requireId: true });
    if (!result.ok) throw new BackupValidationError(`Transaksi ke-${index + 1}: ${result.error}`);
    if (ids.has(result.value.id)) throw new BackupValidationError(`Transaksi ke-${index + 1}: ID transaksi duplikat`);
    ids.add(result.value.id);
    return result.value;
  });
}

function decodeStrictSubscriptions(value: unknown, expectedCount: unknown): Subscription[] {
  if (!Array.isArray(value)) throw new BackupValidationError('Daftar langganan backup tidak valid');
  if (!Number.isSafeInteger(expectedCount) || expectedCount !== value.length) {
    throw new BackupValidationError('Jumlah langganan backup tidak sesuai dengan isinya');
  }

  const ids = new Set<string>();
  return value.map((candidate, index) => {
    const result = validateAndNormalizeSubscription(candidate);
    if (!result.ok) throw new BackupValidationError(`Langganan ke-${index + 1}: ${result.error}`);
    if (ids.has(result.value.id)) throw new BackupValidationError(`Langganan ke-${index + 1}: ID langganan duplikat`);
    ids.add(result.value.id);
    return result.value;
  });
}

function decodeStrictNotifications(value: unknown, expectedCount: unknown, subscriptions: readonly Subscription[]): AppNotification[] {
  if (!Array.isArray(value)) throw new BackupValidationError('Daftar notifikasi backup tidak valid');
  if (!Number.isSafeInteger(expectedCount) || expectedCount !== value.length) {
    throw new BackupValidationError('Jumlah notifikasi backup tidak sesuai dengan isinya');
  }
  const subscriptionIds = new Set(subscriptions.map(({ id }) => id));
  const ids = new Set<string>();
  return value.map((candidate, index) => {
    const result = validateAndNormalizeAppNotification(candidate, subscriptionIds);
    if (!result.ok) throw new BackupValidationError(`Notifikasi ke-${index + 1}: ${result.error}`);
    if (ids.has(result.value.id)) throw new BackupValidationError(`Notifikasi ke-${index + 1}: ID notifikasi duplikat`);
    ids.add(result.value.id);
    return result.value;
  });
}

/** Strict all-or-nothing decoder; v2-v5 remain read-only compatibility formats. */
export function decodeBackup(value: unknown): DecodedBackup {
  if (!isRecord(value)) throw new BackupValidationError('Format backup harus berupa objek');
  if (![CURRENT_BACKUP_VERSION, PREVIOUS_BACKUP_VERSION, CATEGORY_BACKUP_VERSION, LEGACY_BACKUP_VERSION, TRANSACTION_ONLY_BACKUP_VERSION].includes(value.version as string)) {
    throw new BackupValidationError(`Versi backup tidak didukung; diperlukan versi ${CURRENT_BACKUP_VERSION} hingga ${TRANSACTION_ONLY_BACKUP_VERSION}`);
  }
  if (typeof value.exportDate !== 'string' || normalizeTransactionDate(value.exportDate) !== value.exportDate) {
    throw new BackupValidationError('Tanggal ekspor backup harus berupa instant ISO kanonis yang valid');
  }

  const transactions = decodeStrictTransactions(value.transactions, value.transactionCount);
  if (value.version === TRANSACTION_ONLY_BACKUP_VERSION) {
    return {
      version: TRANSACTION_ONLY_BACKUP_VERSION,
      transactions,
      subscriptions: [],
      categories: createDefaultCategoryCatalog(),
      notifications: [],
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      warning: 'Backup versi 2.0 hanya berisi transaksi. Langganan, kategori khusus, dan notifikasi saat ini akan dihapus jika restore dilanjutkan.',
    };
  }

  const subscriptions = decodeStrictSubscriptions(value.subscriptions, value.subscriptionCount);
  if (value.version === LEGACY_BACKUP_VERSION) {
    return {
      version: LEGACY_BACKUP_VERSION,
      transactions,
      subscriptions,
      categories: createDefaultCategoryCatalog(),
      notifications: [],
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      warning: 'Backup versi 3.0 belum menyimpan kategori atau notifikasi. Kategori kembali ke daftar bawaan dan notifikasi dimatikan.',
    };
  }

  const categories = validateCategoryCatalog(value.categories);
  if (!categories) throw new BackupValidationError('Daftar kategori backup tidak valid');
  if (value.version === CATEGORY_BACKUP_VERSION) {
    return {
      version: CATEGORY_BACKUP_VERSION,
      transactions,
      subscriptions,
      categories,
      notifications: [],
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
      warning: 'Backup versi 4.0 belum menyimpan notifikasi. Notifikasi akan dimatikan setelah restore.',
    };
  }

  if (value.version === PREVIOUS_BACKUP_VERSION) {
    const notificationPreferences = decodeNotificationPreferences(value.notificationPreferences);
    if (!notificationPreferences) throw new BackupValidationError('Pengaturan notifikasi backup tidak valid');
    return {
      version: PREVIOUS_BACKUP_VERSION,
      transactions,
      subscriptions,
      categories,
      notifications: migrateLegacyNotifications(value.notifications, subscriptions),
      notificationPreferences,
      warning: 'Notifikasi lama diubah menjadi pengingat langganan.',
    };
  }

  const notifications = decodeStrictNotifications(value.notifications, value.notificationCount, subscriptions);
  const notificationPreferences = decodeNotificationPreferences(value.notificationPreferences);
  if (!notificationPreferences) throw new BackupValidationError('Pengaturan notifikasi backup tidak valid');
  return {
    version: CURRENT_BACKUP_VERSION,
    transactions,
    subscriptions,
    categories,
    notifications,
    notificationPreferences,
    warning: null,
  };
}

export function parseBackupText(text: string): DecodedBackup {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupValidationError('File backup bukan JSON yang valid');
  }
  return decodeBackup(parsed);
}
