import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import QuickTransactionEntry from './QuickTransactionEntry';
import type { NewTransaction, Transaction } from '@/domain/types';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

const previous: Transaction = {
  id: 'previous',
  type: 'expense',
  amount: 13_000,
  category: 'Makanan & Minuman',
  description: 'Sarapan',
  date: new Date(2026, 0, 9, 8).toISOString(),
};

describe('QuickTransactionEntry', () => {
  it('starts without field focus, reuses a complete previous transaction, and saves valid data', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn<(transaction: NewTransaction) => boolean>(() => true);
    render(
      <QuickTransactionEntry
        type="expense"
        category="Makanan & Minuman"
        mode="normal"
        transactions={[previous]}
        onAddTransaction={onAddTransaction}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Makanan & Minuman' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Tutup formulir transaksi' })).not.toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Gunakan lagi Sarapan, Rp13.000' }));
    expect(screen.getByLabelText('Jumlah pengeluaran')).toHaveValue('13.000');
    expect(screen.getByLabelText('Deskripsi')).toHaveValue('Sarapan');
    await user.click(screen.getByRole('button', { name: 'Simpan transaksi' }));
    expect(onAddTransaction).toHaveBeenCalledOnce();
    expect(onAddTransaction.mock.calls[0][0]).toMatchObject({ type: 'expense', category: 'Makanan & Minuman', amount: 13_000, description: 'Sarapan' });
  });

  it('shows at most ten previous transactions', () => {
    const history: Transaction[] = Array.from({ length: 12 }, (_, index) => ({
      ...previous,
      id: `previous-${index}`,
      amount: 10_000 + index,
      description: `Catatan ${index}`,
      date: new Date(2026, 0, index + 1, 8).toISOString(),
    }));

    render(<QuickTransactionEntry type="expense" category="Makanan & Minuman" mode="normal" transactions={history} onAddTransaction={() => true} onClose={vi.fn()} />);

    expect(screen.getAllByRole('button', { name: /^Gunakan lagi/ })).toHaveLength(10);
    expect(screen.getByRole('button', { name: /Gunakan lagi Catatan 11/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gunakan lagi Catatan 0/ })).not.toBeInTheDocument();
  });

  it('shows the Latest empty state for a category without history', () => {
    render(<QuickTransactionEntry type="income" category="Bonus" mode="normal" transactions={[]} onAddTransaction={() => true} onClose={vi.fn()} />);
    expect(screen.getByText('Belum ada transaksi sebelumnya')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan transaksi' })).toBeDisabled();
  });
});
