import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, expect, describe, it, vi } from 'vitest';
import BackupRestore from './BackupRestore';
import { createDefaultCategoryCatalog } from '@/domain/categories';
import type { AppNotification, Subscription, Transaction } from '@/domain/types';

expect.extend(toHaveNoViolations);

const writeNativeExportFile = vi.fn();
const share = vi.fn();

vi.mock('@/platform/export-file', () => ({ writeNativeExportFile: (...args: unknown[]) => writeNativeExportFile(...args) }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/share', () => ({ Share: { share: (...args: unknown[]) => share(...args) } }));

const VALID_BACKUP = JSON.stringify({
  version: '3.0',
  exportDate: '2026-02-10T12:00:00.000Z',
  transactionCount: 0,
  subscriptionCount: 0,
  transactions: [],
  subscriptions: [],
});

describe('BackupRestore dialog', () => {
  beforeEach(() => {
    writeNativeExportFile.mockReset();
    share.mockReset();
  });

  it('states exactly what the backup contains and exports all current data', async () => {
    const user = userEvent.setup();
    const transaction: Transaction = { id: 'tx-1', type: 'expense', amount: 10_000, category: 'Tagihan', description: 'Internet', date: '2026-02-10T12:00:00.000Z' };
    const subscription: Subscription = { id: 'sub-1', name: 'Internet', amount: 10_000, startDate: '2026-01-01', cycleDays: 30, nextPaymentDate: '2026-03-01', color: 'bg-red-200 text-red-800' };
    const notification: AppNotification = { id: 'note-1', daysBefore: 3, time: '08:00', subscriptionIds: ['sub-1'] };
    const categories = createDefaultCategoryCatalog();
    categories.expense.push('Internet');
    writeNativeExportFile.mockResolvedValue({ uri: 'content://backup' });
    share.mockResolvedValue(undefined);

    render(<BackupRestore transactions={[transaction]} subscriptions={[subscription]} categories={categories} notifications={[notification]} notificationPreferences={{ enabled: true }} onRestore={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Backup semua data' })).toBeInTheDocument();
    expect(screen.getByText(/1 transaksi, 1 langganan, 18 kategori, dan 1 jadwal notifikasi/)).toBeInTheDocument();
    const backupButton = screen.getByRole('button', { name: 'Buat file backup' });
    expect(backupButton).toHaveAccessibleDescription(/Termasuk waktu, langganan yang dipilih, dan status notifikasi perangkat/);

    await user.click(backupButton);
    expect(writeNativeExportFile).toHaveBeenCalledOnce();
    const exported = JSON.parse(writeNativeExportFile.mock.calls[0][1]);
    expect(exported).toMatchObject({
      transactions: [transaction],
      subscriptions: [subscription],
      categories,
      notifications: [notification],
      notificationPreferences: { enabled: true },
    });
  });

  it('validates first, then exposes an accessible destructive confirmation', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    const { container } = render(<BackupRestore transactions={[]} subscriptions={[]} onRestore={onRestore} />);
    const restoreButton = screen.getByRole('button', { name: 'Pilih file backup' });
    restoreButton.focus();
    const input = screen.getByLabelText('Pilih file backup JSON');
    const file = new File([VALID_BACKUP], 'backup.json', { type: 'application/json' });
    await user.upload(input, file);

    const dialog = await screen.findByRole('alertdialog', { name: 'Ganti semua data Aureus?' });
    expect(dialog).toHaveAccessibleDescription();
    expect(screen.getByRole('button', { name: 'Ya, ganti semua data' })).toHaveClass('bg-destructive');
    expect(onRestore).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();

    await user.click(screen.getByRole('button', { name: 'Batal' }));
    expect(onRestore).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await screen.findByRole('button', { name: 'Pilih file backup' });
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    expect(restoreButton).toHaveFocus();
  });
});
