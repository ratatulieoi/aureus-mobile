import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import BackupRestore from './BackupRestore';

expect.extend(toHaveNoViolations);

const VALID_BACKUP = JSON.stringify({
  version: '3.0',
  exportDate: '2026-02-10T12:00:00.000Z',
  transactionCount: 0,
  subscriptionCount: 0,
  transactions: [],
  subscriptions: [],
});

describe('BackupRestore dialog', () => {
  it('validates first, then exposes an accessible destructive confirmation', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    const { container } = render(<BackupRestore transactions={[]} subscriptions={[]} onRestore={onRestore} />);
    const restoreButton = screen.getByRole('button', { name: 'Pilih File Backup' });
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
    await screen.findByRole('button', { name: 'Pilih File Backup' });
    await new Promise((resolve) => window.requestAnimationFrame(resolve));
    expect(restoreButton).toHaveFocus();
  });
});
