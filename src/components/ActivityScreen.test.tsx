import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ActivityScreen from './ActivityScreen';
import type { Transaction } from '@/domain/types';

const today = new Date();
const transactions: Transaction[] = [
  { id: 'income', type: 'income', amount: 100_000, category: 'Freelance', description: 'Proyek', date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9).toISOString() },
  { id: 'expense', type: 'expense', amount: 25_000, category: 'Makanan & Minuman', description: 'Makan siang', date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).toISOString() },
];

describe('ActivityScreen', () => {
  it('follows the activity mockup with period, search, type filters, summaries, and grouped rows', async () => {
    const user = userEvent.setup();
    render(<ActivityScreen transactions={transactions} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);

    expect(screen.getByLabelText('Periode')).toBeInTheDocument();
    expect(screen.getByLabelText('Cari transaksi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Rp100.000')).toBeInTheDocument();
    expect(screen.getByText('Rp25.000')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hari ini' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pengeluaran' }));
    expect(screen.queryByText('Rp100.000')).not.toBeInTheDocument();
    expect(screen.getByText('Makan siang')).toBeInTheDocument();
    expect(screen.queryByText('Proyek')).not.toBeInTheDocument();
  });

  it('searches descriptions or categories and opens transaction editing', async () => {
    const user = userEvent.setup();
    render(<ActivityScreen transactions={transactions} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);
    await user.type(screen.getByLabelText('Cari transaksi'), 'freelance');
    expect(screen.getByText('Proyek')).toBeInTheDocument();
    expect(screen.queryByText('Makan siang')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Proyek/ }));
    expect(screen.getByRole('dialog', { name: 'Edit transaksi' })).toBeInTheDocument();
    expect(screen.getByLabelText('Jumlah')).toHaveValue('100.000');
  });
});
