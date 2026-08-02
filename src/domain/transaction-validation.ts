import { calendarDateToLocalInstant, normalizePersistedCalendarDate, parseCalendarDateParts } from '@/domain/calendar-date';
import type { NewTransaction, Transaction, TransactionType } from '@/domain/types';

export const MAX_TRANSACTION_AMOUNT = 999_999_999_999_999;
export const MAX_TRANSACTION_ID_LENGTH = 128;
export const MAX_CATEGORY_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 500;
const ISO_INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-](\d{2}):(\d{2}))$/;
const VALID_ID_PATTERN = /^[A-Za-z0-9._~:+-]+$/;

export interface TransactionValidationOptions {
  requireId?: boolean;
  allowCalendarDate?: boolean;
  migrateLegacyCategory?: boolean;
}

export type TransactionValidationResult =
  | { ok: true; value: Transaction }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRequiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') throw new Error(`${field} harus berupa teks`);
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} wajib diisi`);
  if (normalized.length > maxLength) throw new Error(`${field} terlalu panjang`);
  return normalized;
}

/**
 * Rupiah policy: positive whole Rupiah only, bounded to a safe integer. Numeric
 * strings must be consumed completely; grouping separators belong in the voice
 * parser and are not accepted at this shared boundary.
 */
export function parseRupiahAmount(value: unknown): number | null {
  let amount: number;
  if (typeof value === 'number') {
    amount = value;
  } else if (typeof value === 'string' && /^\s*\d+\s*$/.test(value)) {
    amount = Number(value.trim());
  } else {
    return null;
  }

  return Number.isSafeInteger(amount) && amount > 0 && amount <= MAX_TRANSACTION_AMOUNT
    ? amount
    : null;
}

// Kept as the manual-form API; unlike parseFloat it consumes the whole string.
export function parsePositiveFiniteAmount(value: string): number | null {
  return parseRupiahAmount(value);
}

export function isTransactionType(value: unknown): value is TransactionType {
  return value === 'income' || value === 'expense';
}

export function isValidIdentifier(value: unknown): value is string {
  return typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_TRANSACTION_ID_LENGTH &&
    value.trim() === value &&
    VALID_ID_PATTERN.test(value);
}

/**
 * Transaction dates are canonical instants. Manual calendar dates may be
 * admitted explicitly and are normalized to a local instant at noon, avoiding
 * UTC-midnight drift while remaining deterministic.
 */
export function normalizeTransactionDate(value: unknown, allowCalendarDate = false): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const normalized = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    if (!parseCalendarDateParts(normalized) || !allowCalendarDate) return null;
    const noon = new Date(2000, 0, 1, 12, 0, 0, 0);
    return calendarDateToLocalInstant(normalized, noon);
  }

  const instantMatch = ISO_INSTANT_PATTERN.exec(normalized);
  if (!instantMatch || !parseCalendarDateParts(`${instantMatch[1]}-${instantMatch[2]}-${instantMatch[3]}`)) return null;
  const hour = Number(instantMatch[4]);
  const minute = Number(instantMatch[5]);
  const second = Number(instantMatch[6]);
  const offsetHour = instantMatch[8] === 'Z' ? 0 : Number(instantMatch[9]);
  const offsetMinute = instantMatch[8] === 'Z' ? 0 : Number(instantMatch[10]);
  if (
    hour > 23 || minute > 59 || second > 59 ||
    offsetHour > 14 || offsetMinute > 59 ||
    (offsetHour === 14 && offsetMinute !== 0)
  ) return null;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  const canonical = date.toISOString();
  // Date offsets may move boundary inputs into year 0000 or +010000. Those
  // representations are outside the product's four-digit instant invariant.
  if (!/^\d{4}-/.test(canonical)) return null;
  const canonicalYear = Number(canonical.slice(0, 4));
  return canonicalYear >= 1 && canonicalYear <= 9999 ? canonical : null;
}

export function validateAndNormalizeTransaction(
  value: unknown,
  options: TransactionValidationOptions = {},
): TransactionValidationResult {
  try {
    if (!isRecord(value)) throw new Error('Transaksi harus berupa objek');
    if (!isTransactionType(value.type)) throw new Error('Tipe transaksi tidak valid');

    const amount = parseRupiahAmount(value.amount);
    if (amount === null) throw new Error('Jumlah harus berupa Rupiah bulat positif');

    let category = normalizeRequiredString(value.category, 'Kategori', MAX_CATEGORY_LENGTH);
    if (options.migrateLegacyCategory && category === 'Hashihan') category = 'Tagihan';
    const description = normalizeRequiredString(value.description, 'Keterangan', MAX_DESCRIPTION_LENGTH);
    const date = normalizeTransactionDate(value.date, options.allowCalendarDate);
    if (!date) throw new Error('Tanggal transaksi tidak valid');

    let id = '';
    if (value.id !== undefined || options.requireId) {
      id = normalizeRequiredString(value.id, 'ID transaksi', MAX_TRANSACTION_ID_LENGTH);
      if (!isValidIdentifier(id)) throw new Error('ID transaksi mengandung karakter yang tidak valid');
    }

    return {
      ok: true,
      value: { id, type: value.type, amount, category, description, date },
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Transaksi tidak valid' };
  }
}

export function validateNewTransaction(value: unknown): NewTransaction {
  const result = validateAndNormalizeTransaction({ ...(isRecord(value) ? value : {}), id: '__new__' });
  if (!result.ok) throw new Error(result.error);
  const { id: _id, ...transaction } = result.value;
  return transaction;
}

export function transactionCalendarDate(transaction: Pick<Transaction, 'date'>): string | null {
  const date = new Date(transaction.date);
  if (!Number.isNaN(date.getTime())) {
    const year = date.getFullYear().toString().padStart(4, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return normalizePersistedCalendarDate(transaction.date);
}
