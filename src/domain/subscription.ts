import { addCalendarDays, calendarDateToLocalInstant, compareCalendarDates, formatLocalCalendarDate, normalizePersistedCalendarDate } from '@/domain/calendar-date';
import { generateId, renewalTransactionId } from '@/domain/id';
import type { Subscription, Transaction } from '@/domain/types';
import { isValidIdentifier, MAX_TRANSACTION_AMOUNT, MAX_TRANSACTION_ID_LENGTH } from '@/domain/transaction-validation';

export const SUBSCRIPTION_STORAGE_KEY = 'subscriptions';
export const MAX_RENEWALS_PER_SUBSCRIPTION = 1_000;
export const MAX_SUBSCRIPTION_NAME_LENGTH = 100;
export const MAX_CYCLE_DAYS = 36_600;
// `renewal_` + subscription ID + `_YYYY-MM-DD` must remain a valid transaction
// ID without truncation or hashing, preserving the collision-free occurrence key.
export const RENEWAL_ID_OVERHEAD = 'renewal__YYYY-MM-DD'.length;
export const MAX_SUBSCRIPTION_ID_LENGTH = MAX_TRANSACTION_ID_LENGTH - RENEWAL_ID_OVERHEAD;

export const SUBSCRIPTION_COLORS = [
  'bg-red-200 text-red-800',
  'bg-blue-200 text-blue-800',
  'bg-green-200 text-green-800',
  'bg-yellow-200 text-yellow-800',
  'bg-purple-200 text-purple-800',
  'bg-pink-200 text-pink-800',
] as const;

export interface ReconciliationResult {
  subscriptions: Subscription[];
  transactions: Transaction[];
  blockedSubscriptionIds: string[];
}

export type SubscriptionValidationResult =
  | { ok: true; value: Subscription }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateAndNormalizeSubscription(
  value: unknown,
  options: { generateMissingId?: () => string; migrateLegacyDates?: boolean } = {},
): SubscriptionValidationResult {
  if (!isRecord(value)) return { ok: false, error: 'Langganan harus berupa objek' };

  const name = typeof value.name === 'string' ? value.name.trim() : '';
  if (!name) return { ok: false, error: 'Nama langganan wajib diisi' };
  if (name.length > MAX_SUBSCRIPTION_NAME_LENGTH) return { ok: false, error: 'Nama langganan terlalu panjang' };

  const amount = parseSubscriptionAmount(value.amount);
  if (amount === null) return { ok: false, error: 'Biaya langganan harus berupa Rupiah bulat mulai dari Rp0' };

  const cycleDays = typeof value.cycleDays === 'number'
    ? value.cycleDays
    : typeof value.cycleDays === 'string' && /^\d+$/.test(value.cycleDays.trim())
      ? Number(value.cycleDays)
      : Number.NaN;
  if (!Number.isSafeInteger(cycleDays) || cycleDays < 1 || cycleDays > MAX_CYCLE_DAYS) {
    return { ok: false, error: `Durasi siklus harus bilangan bulat 1-${MAX_CYCLE_DAYS} hari` };
  }

  const normalizeDate = (candidate: unknown): string | null => {
    if (typeof candidate !== 'string') return null;
    return options.migrateLegacyDates ? normalizePersistedCalendarDate(candidate) : normalizePersistedCalendarDate(candidate) === candidate ? candidate : null;
  };
  const startDate = normalizeDate(value.startDate);
  const nextPaymentDate = normalizeDate(value.nextPaymentDate);
  if (!startDate) return { ok: false, error: 'Tanggal mulai langganan tidak valid' };
  if (!nextPaymentDate) return { ok: false, error: 'Tanggal jatuh tempo langganan tidak valid' };
  if (compareCalendarDates(nextPaymentDate, startDate) < 0) {
    return { ok: false, error: 'Tanggal jatuh tempo tidak boleh sebelum tanggal mulai' };
  }

  const existingId = typeof value.id === 'string' ? value.id.trim() : '';
  const id = existingId || options.generateMissingId?.() || '';
  if (!isValidIdentifier(id) || id.length > MAX_SUBSCRIPTION_ID_LENGTH) {
    return { ok: false, error: `ID langganan tidak valid (maksimum ${MAX_SUBSCRIPTION_ID_LENGTH} karakter)` };
  }

  const color = typeof value.color === 'string' && SUBSCRIPTION_COLORS.includes(value.color as typeof SUBSCRIPTION_COLORS[number])
    ? value.color
    : SUBSCRIPTION_COLORS[0];

  return { ok: true, value: { id, name, amount, startDate, cycleDays, nextPaymentDate, color } };
}

/** Invalid persisted subscriptions are quarantined by omission, never executed. */
export function decodeStoredSubscriptions(
  value: unknown,
  makeId: () => string = () => generateId('sub'),
): Subscription[] | null {
  if (!Array.isArray(value)) return null;

  const subscriptions: Subscription[] = [];
  const ids = new Set<string>();
  for (const candidate of value) {
    const result = validateAndNormalizeSubscription(candidate, {
      generateMissingId: makeId,
      migrateLegacyDates: true,
    });
    if (!result.ok) continue;
    let subscription = result.value;
    if (ids.has(subscription.id)) subscription = { ...subscription, id: makeId() };
    if (ids.has(subscription.id)) continue;
    ids.add(subscription.id);
    subscriptions.push(subscription);
  }
  return subscriptions;
}

/**
 * Catch-up policy: preserve every occurrence due on or before the user's local
 * current day, use the scheduled calendar day for the transaction, and advance
 * the checkpoint once. Renewal IDs are `(subscriptionId, dueDate)`, so retries,
 * remounts, and Strict Mode are idempotent at the transaction boundary.
 *
 * A subscription requiring more than the bound is left completely unchanged
 * and emits no partial history; the UI can report it for manual correction.
 */
export function reorderSubscriptions(
  subscriptions: readonly Subscription[],
  activeId: string,
  overId: string,
): Subscription[] {
  const previousIndex = subscriptions.findIndex(({ id }) => id === activeId);
  const nextIndex = subscriptions.findIndex(({ id }) => id === overId);
  if (previousIndex < 0 || nextIndex < 0 || previousIndex === nextIndex) return [...subscriptions];
  const reordered = [...subscriptions];
  const [moved] = reordered.splice(previousIndex, 1);
  if (!moved) return [...subscriptions];
  reordered.splice(nextIndex, 0, moved);
  return reordered;
}

export function areSubscriptionListsEqual(
  left: readonly Subscription[],
  right: readonly Subscription[],
): boolean {
  return left.length === right.length && left.every((subscription, index) => {
    const other = right[index];
    return other !== undefined &&
      subscription.id === other.id &&
      subscription.name === other.name &&
      subscription.amount === other.amount &&
      subscription.startDate === other.startDate &&
      subscription.cycleDays === other.cycleDays &&
      subscription.nextPaymentDate === other.nextPaymentDate &&
      subscription.color === other.color;
  });
}

export function reconcileSubscriptions(
  subscriptions: readonly Subscription[],
  now: Date = new Date(),
  maxRenewals = MAX_RENEWALS_PER_SUBSCRIPTION,
): ReconciliationResult {
  if (Number.isNaN(now.getTime())) throw new TypeError('Waktu rekonsiliasi tidak valid');
  if (!Number.isSafeInteger(maxRenewals) || maxRenewals < 1) throw new RangeError('Batas rekonsiliasi tidak valid');

  const today = formatLocalCalendarDate(now);
  const nextSubscriptions: Subscription[] = [];
  const transactions: Transaction[] = [];
  const blockedSubscriptionIds: string[] = [];

  for (const candidate of subscriptions) {
    const validation = validateAndNormalizeSubscription(candidate);
    if (!validation.ok) continue;
    const subscription = validation.value;
    let dueDate = subscription.nextPaymentDate;
    let occurrences = 0;
    const planned: Transaction[] = [];

    while (compareCalendarDates(dueDate, today) <= 0 && occurrences < maxRenewals) {
      const date = calendarDateToLocalInstant(dueDate, new Date(2000, 0, 1, 12, 0, 0, 0));
      const nextDate = addCalendarDays(dueDate, subscription.cycleDays);
      if (!date || !nextDate || compareCalendarDates(nextDate, dueDate) <= 0) break;
      if (subscription.amount > 0) {
        planned.push({
          id: renewalTransactionId(subscription.id, dueDate),
          type: 'expense',
          amount: subscription.amount,
          category: 'Langganan',
          description: `Perpanjangan: ${subscription.name}`,
          date,
        });
      }
      occurrences += 1;
      dueDate = nextDate;
    }

    if (compareCalendarDates(dueDate, today) <= 0) {
      blockedSubscriptionIds.push(subscription.id);
      nextSubscriptions.push(subscription);
      continue;
    }

    transactions.push(...planned);
    nextSubscriptions.push(dueDate === subscription.nextPaymentDate
      ? subscription
      : { ...subscription, nextPaymentDate: dueDate });
  }

  return { subscriptions: nextSubscriptions, transactions, blockedSubscriptionIds };
}

function parseSubscriptionAmount(value: unknown): number | null {
  let amount: number;
  if (typeof value === 'number') amount = value;
  else if (typeof value === 'string' && /^\s*\d+\s*$/.test(value)) amount = Number(value.trim());
  else return null;
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= MAX_TRANSACTION_AMOUNT ? amount : null;
}
