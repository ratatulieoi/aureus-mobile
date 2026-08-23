import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import SubscriptionManager from './SubscriptionManager';
import type { Subscription } from '@/domain/types';

expect.extend(toHaveNoViolations);

describe('SubscriptionManager', () => {
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
    expect(screen.getByLabelText('Biaya (Rp)')).toHaveAttribute('min', '0');
    expect(screen.getByLabelText('Mulai Tanggal')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Durasi (Hari)')).toHaveAccessibleDescription('Bilangan bulat 1–36.600 hari.');
    expect(screen.getByRole('checkbox', { name: 'Buat transaksi pembayaran pertama pada tanggal mulai?' })).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('does not create direct or reconciled History when the first-payment option is unchecked', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn(() => true);
    const onAddReconciledTransactions = vi.fn();

    const ControlledManager = () => {
      const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
      return (
        <SubscriptionManager
          subscriptions={subscriptions}
          onSubscriptionsChange={setSubscriptions}
          onAddTransaction={onAddTransaction}
          onAddReconciledTransactions={onAddReconciledTransactions}
        />
      );
    };

    render(<ControlledManager />);
    await user.click(screen.getByRole('button', { name: 'Baru' }));
    await user.type(screen.getByLabelText('Nama Layanan'), 'Internet rumah');
    await user.type(screen.getByLabelText('Biaya (Rp)'), '250000');
    const firstPayment = screen.getByRole('checkbox', { name: 'Buat transaksi pembayaran pertama pada tanggal mulai?' });
    await user.click(firstPayment);
    expect(firstPayment).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Mulai Tracking' }));

    expect(await screen.findByRole('heading', { name: 'Internet rumah' })).toBeInTheDocument();
    await waitFor(() => {
      expect(onAddTransaction).not.toHaveBeenCalled();
      expect(onAddReconciledTransactions).not.toHaveBeenCalled();
    });
  });

  it('creates exactly one start-date payment when the first-payment option remains checked', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn(() => true);
    const onAddReconciledTransactions = vi.fn();

    const ControlledManager = () => {
      const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
      return (
        <SubscriptionManager
          subscriptions={subscriptions}
          onSubscriptionsChange={setSubscriptions}
          onAddTransaction={onAddTransaction}
          onAddReconciledTransactions={onAddReconciledTransactions}
        />
      );
    };

    render(<ControlledManager />);
    await user.click(screen.getByRole('button', { name: 'Baru' }));
    await user.type(screen.getByLabelText('Nama Layanan'), 'Musik');
    await user.type(screen.getByLabelText('Biaya (Rp)'), '50000');
    await user.click(screen.getByRole('button', { name: 'Mulai Tracking' }));

    expect(await screen.findByRole('heading', { name: 'Musik' })).toBeInTheDocument();
    expect(onAddTransaction).toHaveBeenCalledOnce();
    expect(onAddTransaction).toHaveBeenCalledWith(expect.objectContaining({
      type: 'expense',
      amount: 50_000,
      category: 'Langganan',
      description: 'Langganan Baru: Musik',
    }));
    expect(onAddReconciledTransactions).not.toHaveBeenCalled();
  });

  it('creates an Rp0 reminder without writing a zero-value transaction', async () => {
    const user = userEvent.setup();
    const onSubscriptionsChange = vi.fn();
    const onAddTransaction = vi.fn(() => true);
    render(
      <SubscriptionManager
        subscriptions={[]}
        onSubscriptionsChange={onSubscriptionsChange}
        onAddTransaction={onAddTransaction}
        onAddReconciledTransactions={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Baru' }));
    await user.type(screen.getByLabelText('Nama Layanan'), 'Paket gratis');
    await user.type(screen.getByLabelText('Biaya (Rp)'), '0');
    await user.click(screen.getByRole('button', { name: 'Mulai Tracking' }));

    expect(onAddTransaction).not.toHaveBeenCalled();
    expect(onSubscriptionsChange).toHaveBeenCalledOnce();
    const updater = onSubscriptionsChange.mock.calls[0][0];
    expect(typeof updater).toBe('function');
    const result = typeof updater === 'function' ? updater([]) : updater;
    expect(result[0]).toMatchObject({ name: 'Paket gratis', amount: 0, cycleDays: 30 });
  });
});
