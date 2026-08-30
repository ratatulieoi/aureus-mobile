import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import ActivityScreen from './ActivityScreen';
import type { Transaction } from '@/domain/types';

expect.extend(toHaveNoViolations);

const today = new Date();
const transactions: Transaction[] = [
  { id: 'income', type: 'income', amount: 100_000, category: 'Freelance', description: 'Proyek', date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9).toISOString() },
  { id: 'expense', type: 'expense', amount: 25_000, category: 'Makanan & Minuman', description: 'Makan siang', date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).toISOString() },
];

describe('ActivityScreen', () => {
  it('orders the Transaction page as a compact header, search, summary filters, and transaction-led content', async () => {
    const user = userEvent.setup();
    const { container } = render(<ActivityScreen transactions={transactions} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Transaction' })).toBeInTheDocument();
    expect(container.querySelector('.activity-page-header')).toContainElement(screen.getByLabelText('Periode'));
    expect(screen.getByLabelText('Cari transaksi')).toBeInTheDocument();
    expect(screen.getByLabelText('Kategori transaksi')).toHaveValue('all');
    expect(screen.getByLabelText('Kategori transaksi')).toHaveTextContent('Freelance');
    expect(screen.getByLabelText('Kategori transaksi')).toHaveTextContent('Makanan & Minuman');
    expect(screen.getByRole('button', { name: 'PemasukanRp100.000' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'PengeluaranRp25.000' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Rp100.000')).toBeInTheDocument();
    expect(screen.getByText('Rp25.000')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Transaksi' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hari ini' })).toBeInTheDocument();
    expect(container.querySelector('.activity-summary')).not.toBeInTheDocument();
    expect(container.querySelector('.activity-controls')?.compareDocumentPosition(container.querySelector('.activity-history')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.querySelector('.activity-history-overview')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'PengeluaranRp25.000' }));
    expect(screen.getByRole('button', { name: 'PengeluaranRp25.000' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Makan siang')).toBeInTheDocument();
    expect(screen.queryByText('Proyek')).not.toBeInTheDocument();
    expect(screen.getByText('Rp100.000')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'PengeluaranRp25.000' }));
    expect(screen.getByText('Proyek')).toBeInTheDocument();
  });

  it('filters by an existing category, searches, and opens the populated edit sheet on a normal tap', async () => {
    const user = userEvent.setup();
    render(<ActivityScreen transactions={transactions} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);
    await user.selectOptions(screen.getByLabelText('Kategori transaksi'), 'Freelance');
    expect(screen.getByText('Proyek')).toBeInTheDocument();
    expect(screen.queryByText('Makan siang')).not.toBeInTheDocument();
    expect(screen.getByText('1 hasil')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Cari transaksi'), 'proyek');
    expect(screen.getByText('Proyek')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Edit Proyek/ }));
    const dialog = screen.getByRole('dialog', { name: 'Edit transaksi' });
    expect(dialog.parentElement).toBe(document.body);
    expect(screen.getByLabelText('Jumlah')).toHaveValue('100.000');
    expect(screen.getByLabelText('Deskripsi')).toHaveValue('Proyek');
    expect(screen.getByLabelText('Kategori')).toHaveValue('Freelance');
    const typeChoices = within(screen.getByRole('group', { name: 'Jenis transaksi' }));
    expect(typeChoices.getByRole('button', { name: 'Pemasukan' })).toHaveAttribute('aria-pressed', 'true');
    expect(typeChoices.getByRole('button', { name: 'Pengeluaran' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('has no accessibility violations in the populated Transaction state', async () => {
    const { container } = render(<ActivityScreen transactions={transactions} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('distinguishes first-use emptiness from filtered no results and offers recovery', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ActivityScreen transactions={[]} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);
    expect(screen.getByText('Belum ada transaksi')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tampilkan semua transaksi' })).not.toBeInTheDocument();

    rerender(<ActivityScreen transactions={transactions} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Kategori transaksi'), { target: { value: 'Freelance' } });
    fireEvent.change(screen.getByLabelText('Cari transaksi'), { target: { value: 'tidak ada' } });
    expect(screen.getByText('Tidak ada transaksi yang cocok')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tampilkan semua transaksi' }));
    expect(screen.getByLabelText('Kategori transaksi')).toHaveValue('all');
    expect(screen.getByText('Makan siang')).toBeInTheDocument();
    expect(screen.getByText('Proyek')).toBeInTheDocument();
  });
});
