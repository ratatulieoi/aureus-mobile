import type { Transaction } from '@/domain/types';

export interface PeriodSelection {
  isAllTime: boolean;
  month: number;
  year: number;
}

export function transactionLocalDate(transaction: Pick<Transaction, 'date'>): Date | null {
  const date = new Date(transaction.date);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function filterTransactionsByPeriod(
  transactions: readonly Transaction[],
  selection: PeriodSelection,
): Transaction[] {
  if (selection.isAllTime) return [...transactions];
  return transactions.filter((transaction) => {
    const date = transactionLocalDate(transaction);
    return date !== null && date.getMonth() === selection.month && date.getFullYear() === selection.year;
  });
}

export function availableTransactionTypes(transactions: readonly Transaction[]): Set<Transaction['type']> {
  return new Set(transactions.map(({ type }) => type));
}

export function normalizeCategoryFilter(selectedCategory: string, categories: readonly string[]): string {
  return selectedCategory === 'all' || categories.includes(selectedCategory) ? selectedCategory : 'all';
}

export function normalizeTypeFilter(
  selectedType: 'all' | Transaction['type'],
  transactions: readonly Transaction[],
): 'all' | Transaction['type'] {
  return selectedType === 'all' || availableTransactionTypes(transactions).has(selectedType) ? selectedType : 'all';
}

/** Binary ledger policy: keep the request when possible, otherwise switch to the sole available type. */
export function resolveBinaryTransactionType(
  requestedType: Transaction['type'],
  transactions: readonly Transaction[],
): Transaction['type'] {
  const available = availableTransactionTypes(transactions);
  if (available.has(requestedType) || available.size !== 1) return requestedType;
  return available.has('income') ? 'income' : 'expense';
}
