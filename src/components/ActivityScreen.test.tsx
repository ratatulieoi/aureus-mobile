import { act, fireEvent, render, screen } from '@testing-library/react';
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
  it('follows the History layout with period, search, type filters, summaries, and grouped rows', async () => {
    const user = userEvent.setup();
    render(<ActivityScreen transactions={transactions} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
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

  it('searches descriptions or categories and opens the populated edit sheet only after a hold', () => {
    vi.useFakeTimers();
    render(<ActivityScreen transactions={transactions} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Cari transaksi'), { target: { value: 'freelance' } });
    expect(screen.getByText('Proyek')).toBeInTheDocument();
    expect(screen.queryByText('Makan siang')).not.toBeInTheDocument();

    const transaction = screen.getByRole('button', { name: /Proyek.*Tahan untuk mengedit/ });
    fireEvent.click(transaction);
    expect(screen.queryByRole('dialog', { name: 'Edit transaksi' })).not.toBeInTheDocument();

    fireEvent.pointerDown(transaction, { pointerId: 1, pointerType: 'touch', button: 0, clientX: 40, clientY: 40 });
    act(() => vi.advanceTimersByTime(550));
    const dialog = screen.getByRole('dialog', { name: 'Edit transaksi' });
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.getByLabelText('Jumlah')).toHaveValue('100.000');
    expect(screen.getByLabelText('Deskripsi')).toHaveValue('Proyek');
    expect(screen.getByLabelText('Kategori')).toHaveValue('Freelance');
    vi.useRealTimers();
  });

  it('cancels transaction editing when a hold turns into a swipe', () => {
    vi.useFakeTimers();
    render(<ActivityScreen transactions={transactions} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);
    const transaction = screen.getByRole('button', { name: /Proyek.*Tahan untuk mengedit/ });
    fireEvent.pointerDown(transaction, { pointerId: 2, pointerType: 'touch', button: 0, clientX: 40, clientY: 40 });
    fireEvent.pointerMove(transaction, { pointerId: 2, pointerType: 'touch', clientX: 80, clientY: 40 });
    act(() => vi.advanceTimersByTime(550));
    expect(screen.queryByRole('dialog', { name: 'Edit transaksi' })).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
