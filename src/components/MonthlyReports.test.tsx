import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import MonthlyReports from './MonthlyReports';
import type { Transaction } from '@/domain/types';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

expect.extend(toHaveNoViolations);

const transactions: Transaction[] = [
  {
    id: 'income',
    type: 'income',
    amount: 3_000_000,
    category: 'Gaji',
    description: 'Gaji bulanan',
    date: new Date(2026, 0, 5, 9).toISOString(),
  },
  {
    id: 'expense',
    type: 'expense',
    amount: 125_000,
    category: 'Belanja',
    description: 'Belanja mingguan',
    date: new Date(2026, 0, 7, 10).toISOString(),
  },
];

describe('Monthly reports', () => {
  beforeEach(() => vi.setSystemTime(new Date(2026, 0, 10, 12)));
  afterEach(() => vi.useRealTimers());

  it('puts period selection before a readable summary and export choices', async () => {
    const { container } = render(<MonthlyReports transactions={transactions} />);

    expect(screen.getByRole('heading', { name: 'Laporan & ekspor' })).toBeInTheDocument();
    expect(screen.getByLabelText('Bulan')).toHaveTextContent('Januari');
    expect(screen.getByLabelText('Tahun')).toHaveTextContent('2026');
    expect(screen.getByText('2 transaksi')).toBeInTheDocument();
    expect(screen.getByText('+ Rp 3.000.000')).toBeInTheDocument();
    expect(screen.getByText('− Rp 125.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 2.875.000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ekspor CSV/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Cetak atau simpan PDF/ })).toBeEnabled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('explains an empty period and disables empty exports', () => {
    render(<MonthlyReports transactions={[]} />);

    expect(screen.getByRole('status')).toHaveTextContent('Belum ada transaksi pada Januari 2026');
    expect(screen.getByRole('button', { name: /Ekspor CSV/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Cetak atau simpan PDF/ })).toBeDisabled();
  });
});
