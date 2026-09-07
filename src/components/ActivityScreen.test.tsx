import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import ActivityScreenComponent from './ActivityScreen';
import type { ComponentProps } from 'react';
import { createDefaultCategoryCatalog } from '@/domain/categories';
import type { Transaction } from '@/domain/types';

expect.extend(toHaveNoViolations);

const ActivityScreen = (props: Omit<ComponentProps<typeof ActivityScreenComponent>, 'categories'> & Partial<Pick<ComponentProps<typeof ActivityScreenComponent>, 'categories'>>) => (
  <ActivityScreenComponent categories={createDefaultCategoryCatalog()} {...props} />
);

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

  it('keeps newest-first order and Indonesian formatting when filtering or updating records', () => {
    const { rerender } = render(<ActivityScreen transactions={transactions} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);
    const rows = () => screen.getAllByRole('button', { name: /^Edit / });
    expect(rows()[0]).toHaveAccessibleName('Edit Makan siang, Makanan & Minuman, pengeluaran Rp25.000');
    expect(rows()[1]).toHaveAccessibleName('Edit Proyek, Freelance, pemasukan Rp100.000');
    expect(within(rows()[0]).getByText('Makanan & Minuman · 12.00')).toBeInTheDocument();
    expect(within(rows()[1]).getByText('Freelance · 09.00')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Cari transaksi'), { target: { value: 'proyek' } });
    expect(rows()).toHaveLength(1);
    expect(rows()[0]).toHaveTextContent('Proyek');
    fireEvent.change(screen.getByLabelText('Cari transaksi'), { target: { value: '' } });
    const updated = [{ ...transactions[0], date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 15).toISOString() }, transactions[1]];
    rerender(<ActivityScreen transactions={updated} onUpdateTransaction={() => true} onDeleteTransaction={vi.fn()} />);
    expect(rows()[0]).toHaveTextContent('Proyek');
    expect(rows()[1]).toHaveTextContent('Makan siang');
    expect(within(rows()[0]).getByText('Freelance · 15.00')).toBeInTheDocument();
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

  it('selects from the saved catalog, including unused custom categories, without accepting free text', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(() => true);
    const categories = { expense: ['Makanan & Minuman', 'Kucing'], income: ['Freelance', 'Gaji'] };
    render(<ActivityScreen transactions={transactions} categories={categories} onUpdateTransaction={onUpdate} onDeleteTransaction={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Edit Makan siang/ }));
    const select = screen.getByRole('combobox', { name: 'Kategori' });
    expect(screen.queryByRole('textbox', { name: 'Kategori' })).not.toBeInTheDocument();
    expect(within(select).getAllByRole('option').map((option) => option.textContent)).toEqual(['Pilih kategori', 'Makanan & Minuman', 'Kucing']);
    await user.selectOptions(select, 'Kucing');
    expect(onUpdate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    expect(onUpdate).toHaveBeenCalledWith({ ...transactions[1], category: 'Kucing' });
  });

  it('requires a matching category after changing the transaction type', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(() => true);
    render(<ActivityScreen transactions={transactions} onUpdateTransaction={onUpdate} onDeleteTransaction={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Edit Makan siang/ }));
    await user.click(within(screen.getByRole('group', { name: 'Jenis transaksi' })).getByRole('button', { name: 'Pemasukan' }));
    const select = screen.getByRole('combobox', { name: 'Kategori' });
    expect(select).toHaveValue('');
    expect(within(select).queryByRole('option', { name: 'Makanan & Minuman' })).not.toBeInTheDocument();
    fireEvent.submit(select.closest('form')!);
    expect(onUpdate).not.toHaveBeenCalled();
    await user.selectOptions(select, 'Gaji');
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    expect(onUpdate).toHaveBeenCalledWith({ ...transactions[1], type: 'income', category: 'Gaji' });
  });

  it.each(['Kategori lama', 'Langganan'])('preserves the original %s category when it is outside the catalog', async (category) => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(() => true);
    const transaction = { ...transactions[1], category };
    render(<ActivityScreen transactions={[transaction]} categories={{ expense: [], income: [] }} onUpdateTransaction={onUpdate} onDeleteTransaction={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Edit Makan siang/ }));
    expect(screen.getByRole('combobox', { name: 'Kategori' })).toHaveValue(category);
    await user.clear(screen.getByLabelText('Deskripsi'));
    await user.type(screen.getByLabelText('Deskripsi'), 'Diperbarui');
    await user.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    expect(onUpdate).toHaveBeenCalledWith({ ...transaction, description: 'Diperbarui' });
  });

  it('does not invent a category when the selected type has an empty catalog', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(() => true);
    render(<ActivityScreen transactions={transactions} categories={{ expense: [], income: [] }} onUpdateTransaction={onUpdate} onDeleteTransaction={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Edit Makan siang/ }));
    await user.click(within(screen.getByRole('group', { name: 'Jenis transaksi' })).getByRole('button', { name: 'Pemasukan' }));
    const select = screen.getByRole('combobox', { name: 'Kategori' });
    expect(select).toHaveValue('');
    expect(screen.getByText(/Tambahkan melalui Others/)).toBeInTheDocument();
    fireEvent.submit(select.closest('form')!);
    expect(onUpdate).not.toHaveBeenCalled();
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
