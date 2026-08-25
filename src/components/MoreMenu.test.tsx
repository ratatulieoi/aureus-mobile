import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import MoreMenu from './MoreMenu';
import { createDefaultCategoryCatalog } from '@/domain/categories';
import type { Subscription, Transaction } from '@/domain/types';

expect.extend(toHaveNoViolations);

const transaction: Transaction = {
  id: 'transaction-1',
  type: 'expense',
  amount: 25_000,
  category: 'Makanan & Minuman',
  description: 'Makan siang',
  date: new Date(2026, 0, 3, 12).toISOString(),
};

const subscription: Subscription = {
  id: 'subscription-1',
  name: 'Musik',
  amount: 49_000,
  startDate: '2026-01-01',
  cycleDays: 30,
  nextPaymentDate: '2026-02-01',
  color: '#000000',
};

const renderMenu = () => render(
  <MoreMenu
    transactions={[transaction]}
    subscriptions={[subscription]}
    categories={createDefaultCategoryCatalog()}
    notifications={[]}
    notificationPreferences={{ enabled: false }}
    onCategoriesChange={vi.fn()}
    onNotificationsChange={vi.fn()}
    onNotificationPreferencesChange={vi.fn()}
    onRestore={vi.fn()}
  />,
);

describe('Others menu', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
  });

  it('groups destinations, shows useful counts, and changes the theme in place', async () => {
    const user = userEvent.setup();
    const { container } = renderMenu();

    expect(screen.getByRole('heading', { name: 'Others' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Keuangan' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Data & aplikasi' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Kelola kategori/ })).toHaveTextContent('17 kategori pemasukan dan pengeluaran');
    expect(screen.getByRole('button', { name: /Notifikasi/ })).toHaveTextContent('0 notifikasi');
    expect(screen.getByRole('button', { name: /Backup & pulihkan/ })).toHaveTextContent('1 transaksi dan 1 langganan tersimpan');

    const themeButton = screen.getByRole('button', { name: /Tema aplikasi, Terang aktif/ });
    expect(themeButton).toHaveAttribute('aria-pressed', 'false');
    await user.click(themeButton);
    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByRole('button', { name: /Tema aplikasi, Gelap aktif/ })).toHaveAttribute('aria-pressed', 'true');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('opens a destination and returns to the grouped menu', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: /Kelola kategori/ }));
    expect(screen.getByRole('heading', { name: 'Kelola kategori' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Kembali ke Others' }));
    expect(screen.getByRole('heading', { name: 'Others' })).toBeInTheDocument();
  });
});
