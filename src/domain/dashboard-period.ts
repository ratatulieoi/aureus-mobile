import { addCalendarDays, formatLocalCalendarDate } from '@/domain/calendar-date';
import type { Transaction } from '@/domain/types';
import { transactionLocalDate } from '@/domain/period';

export type QuickPeriodId = 'all' | 'today' | '7d' | '14d' | '30d' | '90d' | '180d' | '365d';

export type DashboardPeriod =
  | { kind: 'quick'; id: QuickPeriodId }
  | { kind: 'month'; month: number; year: number };

export const QUICK_PERIOD_OPTIONS: ReadonlyArray<{ id: QuickPeriodId; label: string; days: number | null }> = [
  { id: 'all', label: 'Semua', days: null },
  { id: 'today', label: 'Hari ini', days: 1 },
  { id: '7d', label: '7 hari', days: 7 },
  { id: '14d', label: '2 minggu', days: 14 },
  { id: '30d', label: '1 bulan', days: 30 },
  { id: '90d', label: '3 bulan', days: 90 },
  { id: '180d', label: '6 bulan', days: 180 },
  { id: '365d', label: '1 tahun', days: 365 },
];

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

export function dashboardPeriodLabel(period: DashboardPeriod): string {
  if (period.kind === 'month') return `${MONTHS[period.month]} ${period.year}`;
  return QUICK_PERIOD_OPTIONS.find(({ id }) => id === period.id)?.label ?? 'Hari ini';
}

export function filterTransactionsForDashboard(
  transactions: readonly Transaction[],
  period: DashboardPeriod,
  now = new Date(),
): Transaction[] {
  if (Number.isNaN(now.getTime())) return [];
  if (period.kind === 'month') {
    return transactions.filter((transaction) => {
      const date = transactionLocalDate(transaction);
      return date !== null && date.getFullYear() === period.year && date.getMonth() === period.month;
    });
  }
  if (period.id === 'all') {
    const end = formatLocalCalendarDate(now);
    return transactions.filter((transaction) => {
      const date = transactionLocalDate(transaction);
      return date !== null && formatLocalCalendarDate(date) <= end;
    });
  }

  const option = QUICK_PERIOD_OPTIONS.find(({ id }) => id === period.id);
  const days = option?.days ?? 1;
  const end = formatLocalCalendarDate(now);
  const start = addCalendarDays(end, -(days - 1));
  if (!start) return [];
  return transactions.filter((transaction) => {
    const date = transactionLocalDate(transaction);
    if (!date) return false;
    const day = formatLocalCalendarDate(date);
    return day >= start && day <= end;
  });
}

export function dashboardAvailableYears(transactions: readonly Transaction[], now = new Date()): number[] {
  const currentYear = now.getFullYear();
  const years = new Set<number>([currentYear]);
  for (const transaction of transactions) {
    const date = transactionLocalDate(transaction);
    if (date && date.getFullYear() <= currentYear) years.add(date.getFullYear());
  }
  return [...years].sort((left, right) => right - left);
}

export function canSelectDashboardMonth(month: number, year: number, now = new Date()): boolean {
  if (!Number.isInteger(month) || month < 0 || month > 11 || !Number.isInteger(year)) return false;
  return year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth());
}
