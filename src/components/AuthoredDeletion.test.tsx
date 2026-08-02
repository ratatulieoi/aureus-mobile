import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import type { Budget, Transaction } from '@/domain/types';
import BudgetManager from './BudgetManager';
import TransactionHistory from './TransactionHistory';

expect.extend(toHaveNoViolations);

const transaction: Transaction = {
  id: 'tx-history',
  type: 'expense',
  amount: 40_000,
  category: 'Transportasi',
  description: 'Taksi pulang',
  date: new Date(2026, 1, 12, 18).toISOString(),
};

const budget: Budget = { id: 'budget-food', category: 'Makanan & Minuman', amount: 100_000, month: 1, year: 2026 };

describe('authored destructive controls', () => {
  it('uses focus-safe accessible confirmation in TransactionHistory', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const { container } = render(<TransactionHistory transactions={[transaction]} onDeleteTransaction={onDelete} />);
    const trigger = screen.getByRole('button', { name: 'Hapus transaksi Taksi pulang' });
    await user.click(trigger);

    const dialog = screen.getByRole('alertdialog', { name: 'Hapus transaksi?' });
    expect(within(dialog).getByText(/Taksi pulang/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    await user.click(within(dialog).getByRole('button', { name: 'Batal' }));
    await waitForFocus(trigger);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('names budget progress/status and confirms deletion accessibly', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const { container } = render(<BudgetManager budgets={[budget]} transactions={[transaction]} onAddBudget={() => undefined} onDeleteBudget={onDelete} selectedMonth={1} selectedYear={2026} />);
    const progress = screen.getByRole('progressbar', { name: 'Pemakaian budget Makanan & Minuman' });
    expect(progress).toHaveAttribute('aria-valuetext', expect.stringContaining('Dalam batas'));
    expect(screen.getByText('Dalam batas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hapus budget Makanan & Minuman' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Hapus budget?' });
    expect(await axe(container)).toHaveNoViolations();
    const confirm = within(dialog).getByRole('button', { name: 'Ya, hapus budget' });
    expect(confirm).toHaveClass('bg-destructive');
    await user.click(confirm);
    expect(onDelete).toHaveBeenCalledWith('budget-food');
  });
});

async function waitForFocus(element: HTMLElement) {
  for (let attempt = 0; attempt < 5 && document.activeElement !== element; attempt += 1) {
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
  }
  expect(element).toHaveFocus();
}
