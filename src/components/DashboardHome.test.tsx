import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import DashboardHome from './DashboardHome';
import { createDefaultCategoryCatalog } from '@/domain/categories';
import type { Transaction } from '@/domain/types';

const now = new Date(2026, 0, 10, 12);
const transactions: Transaction[] = [
  { id: 'food-1', type: 'expense', amount: 10_000, category: 'Makanan & Minuman', description: 'Sarapan', date: new Date(2026, 0, 10, 8).toISOString() },
  { id: 'food-2', type: 'expense', amount: 15_000, category: 'Makanan & Minuman', description: 'Makan siang', date: new Date(2026, 0, 10, 11).toISOString() },
  { id: 'transport', type: 'expense', amount: 5_000, category: 'Transportasi', description: 'Parkir', date: new Date(2026, 0, 10, 9).toISOString() },
  { id: 'income', type: 'income', amount: 100_000, category: 'Freelance', description: 'Proyek', date: new Date(2026, 0, 10, 7).toISOString() },
];

function renderDashboard(onOpenEntry = vi.fn(), onPeriodChange = vi.fn()) {
  const onActiveTypeChange = vi.fn();
  render(
    <DashboardHome
      transactions={transactions}
      categories={createDefaultCategoryCatalog()}
      activeType="expense"
      onActiveTypeChange={onActiveTypeChange}
      period={{ kind: 'quick', id: 'today' }}
      onPeriodChange={onPeriodChange}
      now={now}
      onOpenEntry={onOpenEntry}
    />,
  );
  return { onActiveTypeChange, onPeriodChange };
}

describe('DashboardHome', () => {
  it('ranks categories by frequency and swaps the active transaction type', async () => {
    const { onActiveTypeChange } = renderDashboard();
    const categoryButtons = screen.getAllByRole('button', { name: /input normal/ });
    expect(categoryButtons[0]).toHaveAccessibleName(expect.stringContaining('Makanan & Minuman, Rp25.000'));
    expect(categoryButtons[0]).toHaveTextContent('2 transaksi');
    expect(screen.getByRole('button', { name: /Belanja, belum ada transaksi/ })).toHaveTextContent('Rp0');
    expect(screen.queryByText('••••')).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tampilkan pemasukan' }));
    expect(onActiveTypeChange).toHaveBeenCalledWith('income');
  });

  it('opens normal entry after the completed click and suppresses the click after a voice hold', () => {
    vi.useFakeTimers();
    const onOpenEntry = vi.fn();
    renderDashboard(onOpenEntry);
    const category = screen.getAllByRole('button', { name: /input normal/ })[0];

    fireEvent.pointerDown(category, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(category, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(onOpenEntry).not.toHaveBeenCalled();
    fireEvent.click(category);
    expect(onOpenEntry).toHaveBeenLastCalledWith('Makanan & Minuman', false);

    fireEvent.pointerDown(category, { pointerId: 2, clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(550);
    fireEvent.pointerUp(category, { pointerId: 2, clientX: 10, clientY: 10 });
    fireEvent.click(category);
    expect(onOpenEntry).toHaveBeenLastCalledWith('Makanan & Minuman', true);
    expect(onOpenEntry).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('toggles the month list when the period trigger is clicked', async () => {
    renderDashboard();
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: 'Hari ini' });

    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Pilih bulan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Januari' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Februari' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Pilih kategori pengeluaran' })).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole('dialog', { name: 'Pilih bulan' })).not.toBeInTheDocument();
  });

  it('waits for the completed backdrop click before dismissing the month list', async () => {
    renderDashboard();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Hari ini' }));
    const backdrop = document.querySelector<HTMLElement>('.month-picker-backdrop');
    expect(backdrop).not.toBeNull();

    fireEvent.pointerDown(backdrop!);
    expect(screen.getByRole('dialog', { name: 'Pilih bulan' })).toBeInTheDocument();

    fireEvent.pointerUp(backdrop!);
    fireEvent.click(backdrop!);
    expect(screen.queryByRole('dialog', { name: 'Pilih bulan' })).not.toBeInTheDocument();
  });

  it('marks only selectable months containing transaction data', async () => {
    const onPeriodChange = vi.fn();
    render(
      <DashboardHome
        transactions={[
          { ...transactions[0], id: 'january-data', date: new Date(2026, 0, 10, 8).toISOString() },
          { ...transactions[1], id: 'invalid-data', date: 'invalid-date' },
        ]}
        categories={createDefaultCategoryCatalog()}
        activeType="expense"
        onActiveTypeChange={vi.fn()}
        period={{ kind: 'quick', id: 'today' }}
        onPeriodChange={onPeriodChange}
        now={new Date(2026, 2, 10, 12)}
        onOpenEntry={vi.fn()}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Hari ini' }));
    const january = screen.getByRole('button', { name: 'Januari' });
    const february = screen.getByRole('button', { name: 'Februari' });
    const april = screen.getByRole('button', { name: 'April' });
    expect(january).toHaveClass('month-picker-destination', 'dock-glass-destination');
    expect(january).toHaveAttribute('data-glass-active', 'true');
    expect(january).toHaveAttribute('data-has-transactions', 'true');
    expect(january).toHaveAccessibleDescription('Memiliki transaksi pada bulan ini.');
    expect(february).toHaveClass('month-picker-destination', 'dock-glass-destination');
    expect(february).not.toHaveAttribute('data-glass-active');
    expect(february).not.toHaveAttribute('aria-selected');
    expect(february).not.toHaveAttribute('aria-current');
    expect(february).toBeEnabled();
    expect(april).toBeDisabled();

    await user.click(february);
    expect(onPeriodChange).toHaveBeenCalledWith({ kind: 'month', month: 1, year: 2026 });
  });

  it('opens quick periods after a hold and applies the highlighted period on release', () => {
    vi.useFakeTimers();
    const onPeriodChange = vi.fn();
    renderDashboard(vi.fn(), onPeriodChange);
    const trigger = screen.getByRole('button', { name: 'Hari ini' });
    fireEvent.pointerDown(trigger, { pointerId: 4, clientX: 20, clientY: 20 });
    act(() => vi.advanceTimersByTime(550));
    const picker = screen.getByRole('listbox', { name: 'Pilih periode cepat' });
    expect(picker).toBeInTheDocument();
    expect(picker).toHaveAttribute('data-anchor-period', 'today');
    expect(picker.parentElement).toBe(document.body);
    expect(screen.getByRole('option', { name: 'Hari ini' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.pointerUp(trigger, { pointerId: 4, clientX: 20, clientY: 20 });
    expect(onPeriodChange).toHaveBeenCalledWith({ kind: 'quick', id: 'today' });
    vi.useRealTimers();
  });
});
