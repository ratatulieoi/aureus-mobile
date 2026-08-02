import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import type { Transaction } from '@/domain/types';
import TransactionTable from './TransactionTable';

expect.extend(toHaveNoViolations);

const transaction: Transaction = {
  id: 'tx-1',
  type: 'expense',
  amount: 25_000,
  category: 'Makanan & Minuman',
  description: 'Nasi goreng spesial',
  date: new Date(2026, 1, 10, 12).toISOString(),
};

describe('TransactionTable keyboard interactions', () => {
  it('operates disclosure with keyboard and keeps delete independent', async () => {
    const user = userEvent.setup();
    const onDeleteTransaction = vi.fn();
    const { container } = render(
      <TransactionTable transactions={[transaction]} onDeleteTransaction={onDeleteTransaction} selectedMonth={1} selectedYear={2026} />,
    );

    const expenseFilter = screen.getByRole('radio', { name: 'Tampilkan pengeluaran' });
    await user.click(expenseFilter);
    const disclosure = screen.getByRole('button', { name: 'Tampilkan detail transaksi Nasi goreng spesial' });
    disclosure.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('region', { name: 'Detail transaksi' })).toHaveTextContent('Nasi goreng spesial');
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Detail transaksi' })).not.toBeInTheDocument();
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'Hapus transaksi Nasi goreng spesial' }));
    const confirmation = screen.getByRole('alertdialog', { name: 'Hapus transaksi?' });
    expect(within(confirmation).getByText(/Nasi goreng spesial/)).toBeInTheDocument();
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    expect(await axe(container)).toHaveNoViolations();

    await user.click(within(confirmation).getByRole('button', { name: 'Ya, hapus transaksi' }));
    expect(onDeleteTransaction).toHaveBeenCalledOnce();
    expect(onDeleteTransaction).toHaveBeenCalledWith('tx-1');
  });

  it('activates the disclosure with Space', async () => {
    const user = userEvent.setup();
    render(<TransactionTable transactions={[transaction]} onDeleteTransaction={() => undefined} selectedMonth={1} selectedYear={2026} />);
    await user.click(screen.getByRole('radio', { name: 'Tampilkan pengeluaran' }));
    const disclosure = screen.getByRole('button', { name: 'Tampilkan detail transaksi Nasi goreng spesial' });
    disclosure.focus();
    await user.keyboard(' ');
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
  });
});
