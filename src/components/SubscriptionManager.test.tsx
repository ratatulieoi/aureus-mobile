import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import SubscriptionManager from './SubscriptionManager';
import type { Subscription } from '@/domain/types';

expect.extend(toHaveNoViolations);

const requiredProps = {
  onAddTransaction: () => true,
  onAddReconciledTransactions: vi.fn(),
};

describe('SubscriptionManager', () => {
  it('labels the compact subscription form', async () => {
    const user = userEvent.setup();
    const { container } = render(<SubscriptionManager subscriptions={[]} onSubscriptionsChange={vi.fn()} {...requiredProps} />);

    await user.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(screen.getByLabelText('Nama layanan')).toHaveAttribute('maxlength', '100');
    expect(screen.getByLabelText('Biaya (Rp)')).toHaveAttribute('min', '0');
    expect(screen.getByLabelText('Tanggal mulai')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('Siklus (hari)')).toHaveAttribute('max', '36600');
    expect(screen.getByRole('checkbox', { name: 'Catat pembayaran pertama' })).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('does not create History when the first-payment option is unchecked', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn(() => true);
    const onAddReconciledTransactions = vi.fn();
    const ControlledManager = () => {
      const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
      return <SubscriptionManager subscriptions={subscriptions} onSubscriptionsChange={setSubscriptions} onAddTransaction={onAddTransaction} onAddReconciledTransactions={onAddReconciledTransactions} />;
    };

    render(<ControlledManager />);
    await user.click(screen.getByRole('button', { name: 'Tambah' }));
    await user.type(screen.getByLabelText('Nama layanan'), 'Internet rumah');
    await user.type(screen.getByLabelText('Biaya (Rp)'), '250000');
    await user.click(screen.getByRole('checkbox', { name: 'Catat pembayaran pertama' }));
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByRole('heading', { name: 'Internet rumah' })).toBeInTheDocument();
    await waitFor(() => {
      expect(onAddTransaction).not.toHaveBeenCalled();
      expect(onAddReconciledTransactions).not.toHaveBeenCalled();
    });
  });

  it('creates one start-date payment when the option remains checked', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn(() => true);
    const ControlledManager = () => {
      const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
      return <SubscriptionManager subscriptions={subscriptions} onSubscriptionsChange={setSubscriptions} onAddTransaction={onAddTransaction} onAddReconciledTransactions={vi.fn()} />;
    };

    render(<ControlledManager />);
    await user.click(screen.getByRole('button', { name: 'Tambah' }));
    await user.type(screen.getByLabelText('Nama layanan'), 'Musik');
    await user.type(screen.getByLabelText('Biaya (Rp)'), '50000');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(await screen.findByRole('heading', { name: 'Musik' })).toBeInTheDocument();
    expect(onAddTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: 'expense', amount: 50_000, category: 'Langganan' }));
  });

  it('shows a bell count for assigned notification items', async () => {
    const onOpenNotifications = vi.fn();
    const user = userEvent.setup();
    render(
      <SubscriptionManager
        subscriptions={[{ id: 'sub-1', name: 'Streaming', amount: 50_000, startDate: '2026-01-01', cycleDays: 30, nextPaymentDate: '2026-09-01', color: 'red' }]}
        notifications={[
          { id: 'note-1', daysBefore: 7, time: '09:00', subscriptionIds: ['sub-1'] },
          { id: 'note-2', daysBefore: 1, time: '09:00', subscriptionIds: ['sub-1'] },
        ]}
        onSubscriptionsChange={vi.fn()}
        {...requiredProps}
        onOpenNotifications={onOpenNotifications}
      />,
    );
    expect(screen.getByLabelText('2 notifikasi')).toHaveTextContent('2');
    expect(screen.queryByText('Tanpa pengingat')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Notifikasi' }));
    expect(onOpenNotifications).toHaveBeenCalledOnce();
  });

  it('creates an Rp0 subscription without a zero-value transaction', async () => {
    const user = userEvent.setup();
    const onSubscriptionsChange = vi.fn();
    const onAddTransaction = vi.fn(() => true);
    render(<SubscriptionManager subscriptions={[]} onSubscriptionsChange={onSubscriptionsChange} onAddTransaction={onAddTransaction} onAddReconciledTransactions={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Tambah' }));
    await user.type(screen.getByLabelText('Nama layanan'), 'Paket gratis');
    await user.type(screen.getByLabelText('Biaya (Rp)'), '0');
    await user.click(screen.getByRole('button', { name: 'Simpan' }));

    expect(onAddTransaction).not.toHaveBeenCalled();
    expect(onSubscriptionsChange).toHaveBeenCalledOnce();
  });
});
