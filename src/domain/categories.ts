import type { CategoryCatalog, TransactionType } from '@/domain/types';

export const DEFAULT_TRANSACTION_CATEGORIES: Readonly<Record<TransactionType, readonly string[]>> = {
  expense: [
    'Makanan & Minuman',
    'Transportasi',
    'Belanja',
    'Tagihan',
    'Kesehatan',
    'Hiburan',
    'Pendidikan',
    'Rumah Tangga',
    'Komunikasi',
    'Lainnya',
  ],
  income: [
    'Gaji',
    'Bonus',
    'Penjualan',
    'Investasi',
    'Freelance',
    'Pemasukan Lain',
  ],
};

// Compatibility alias for components that do not receive the persisted catalog.
export const TRANSACTION_CATEGORIES = DEFAULT_TRANSACTION_CATEGORIES;

export const MAX_CATEGORY_NAME_LENGTH = 100;
const RESERVED_EXPENSE_CATEGORY = 'langganan';

export function createDefaultCategoryCatalog(): CategoryCatalog {
  return {
    expense: [...DEFAULT_TRANSACTION_CATEGORIES.expense],
    income: [...DEFAULT_TRANSACTION_CATEGORIES.income],
  };
}

export function normalizeCategoryName(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function validateCategoryCatalog(value: unknown): CategoryCatalog | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const expense = validateCategoryList(record.expense);
  const income = validateCategoryList(record.income);
  return expense && income
    ? { expense: expense.filter((category) => category.toLocaleLowerCase('id-ID') !== RESERVED_EXPENSE_CATEGORY), income }
    : null;
}

export function validateNewCategoryName(
  catalog: CategoryCatalog,
  type: TransactionType,
  value: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const name = normalizeCategoryName(value);
  if (!name) return { ok: false, error: 'Nama kategori wajib diisi.' };
  if (name.length > MAX_CATEGORY_NAME_LENGTH) {
    return { ok: false, error: `Nama kategori maksimum ${MAX_CATEGORY_NAME_LENGTH} karakter.` };
  }
  const folded = name.toLocaleLowerCase('id-ID');
  if (type === 'expense' && folded === RESERVED_EXPENSE_CATEGORY) {
    return { ok: false, error: 'Kategori Langganan dikelola otomatis dari menu Subs.' };
  }
  if (catalog[type].some((category) => category.toLocaleLowerCase('id-ID') === folded)) {
    return { ok: false, error: 'Kategori ini sudah ada.' };
  }
  return { ok: true, value: name };
}

function validateCategoryList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const categories: string[] = [];
  const names = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== 'string') return null;
    const name = normalizeCategoryName(candidate);
    const folded = name.toLocaleLowerCase('id-ID');
    if (!name || name.length > MAX_CATEGORY_NAME_LENGTH || names.has(folded)) return null;
    names.add(folded);
    categories.push(name);
  }
  return categories;
}
