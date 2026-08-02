import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import SubscriptionManager from './SubscriptionManager';

expect.extend(toHaveNoViolations);

describe('SubscriptionManager accessibility', () => {
  it('associates every form label and description with its control', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SubscriptionManager
        subscriptions={[]}
        onSubscriptionsChange={vi.fn()}
        onAddTransaction={() => true}
        onAddReconciledTransactions={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Baru' }));
    expect(screen.getByLabelText('Nama Layanan')).toHaveAccessibleDescription('Maksimum 100 karakter.');
    expect(screen.getByLabelText('Biaya (Rp)')).toHaveAttribute('min', '1');
    expect(screen.getByLabelText('Mulai Tanggal')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Durasi (Hari)')).toHaveAccessibleDescription('Bilangan bulat 1–36.600 hari.');
    expect(screen.getByRole('checkbox', { name: 'Buat transaksi pembayaran pertama pada tanggal mulai?' })).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
  });
});
