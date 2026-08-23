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
    expect(screen.getAllByRole('button', { name: /input normal/ })[0]).toHaveAccessibleName(expect.stringContaining('Makanan & Minuman, Rp25.000'));
    await userEvent.setup().click(screen.getByRole('button', { name: 'Tampilkan pemasukan' }));
    expect(onActiveTypeChange).toHaveBeenCalledWith('income');
  });

  it('opens normal entry on a short press and voice entry after a hold', () => {
    vi.useFakeTimers();
    const onOpenEntry = vi.fn();
    renderDashboard(onOpenEntry);
    const category = screen.getAllByRole('button', { name: /input normal/ })[0];

    fireEvent.pointerDown(category, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(category, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(onOpenEntry).toHaveBeenLastCalledWith('Makanan & Minuman', false);

    fireEvent.pointerDown(category, { pointerId: 2, clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(550);
    fireEvent.pointerUp(category, { pointerId: 2, clientX: 10, clientY: 10 });
    expect(onOpenEntry).toHaveBeenLastCalledWith('Makanan & Minuman', true);
    expect(onOpenEntry).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('opens the month list on a short click', async () => {
    renderDashboard();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Hari ini' }));
    expect(screen.getByRole('dialog', { name: 'Pilih bulan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Januari' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Februari' })).toBeDisabled();
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
