import { useState } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const subscriptions: Subscription[] = [
  { id: 'sub-1', name: 'Streaming', amount: 50_000, startDate: '2026-01-01', cycleDays: 30, nextPaymentDate: '2026-09-01', color: 'bg-red-200 text-red-800' },
  { id: 'sub-2', name: 'Internet', amount: 250_000, startDate: '2026-01-02', cycleDays: 30, nextPaymentDate: '2026-09-02', color: 'bg-blue-200 text-blue-800' },
];

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

  it('shows a compact monthly estimate without an active-subscription counter', () => {
    render(<SubscriptionManager subscriptions={subscriptions} onSubscriptionsChange={vi.fn()} {...requiredProps} />);

    expect(screen.queryByText('Langganan aktif')).not.toBeInTheDocument();
    expect(screen.getByText('Perkiraan per bulan')).toBeInTheDocument();
    expect(screen.getByText('Rp 300.000')).toBeInTheDocument();
  });

  it('provides accessible drag handles for reordering subscriptions', async () => {
    const { container } = render(<SubscriptionManager subscriptions={subscriptions} onSubscriptionsChange={vi.fn()} {...requiredProps} />);

    expect(screen.getByRole('button', { name: 'Ubah urutan Streaming' })).toHaveAttribute('aria-roledescription', 'sortable');
    expect(screen.getByRole('button', { name: 'Ubah urutan Streaming' })).toHaveAttribute('data-no-page-swipe', 'true');
    expect(screen.getByRole('button', { name: 'Ubah urutan Internet' })).toHaveAttribute('aria-roledescription', 'sortable');
    expect(screen.queryByText('Tahan pegangan, lalu geser untuk mengurutkan.')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('shows assigned notification item names only while the bell is held', async () => {
    vi.useFakeTimers();
    const onOpenNotifications = vi.fn();
    render(
      <SubscriptionManager
        subscriptions={[subscriptions[0]]}
        notifications={[
          { id: 'note-1', title: '{name} jatuh tempo', message: 'Tagihan Rp {amount} jatuh tempo {due}.', daysBefore: 7, time: '09:00', subscriptionIds: ['sub-1'] },
          { id: 'note-2', title: '{name} jatuh tempo', message: 'Tagihan Rp {amount} jatuh tempo {due}.', daysBefore: 1, time: '09:00', subscriptionIds: ['sub-1'] },
        ]}
        onSubscriptionsChange={vi.fn()}
        {...requiredProps}
        onOpenNotifications={onOpenNotifications}
      />,
    );
    const reminderButton = screen.getByRole('button', { name: '2 notifikasi Streaming. Tahan untuk melihat.' });
    expect(reminderButton).toHaveTextContent('2');
    expect(reminderButton).toHaveAttribute('data-no-page-swipe', 'true');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.pointerDown(reminderButton, { pointerId: 7, pointerType: 'touch', clientX: 20, clientY: 20 });
    act(() => vi.advanceTimersByTime(300));
    const tooltip = screen.getByRole('tooltip');
    expect(reminderButton.closest('.subscription-card')).toHaveClass('has-reminder-tooltips');
    expect(tooltip.children).toHaveLength(2);
    expect(tooltip).toHaveTextContent('H-7');
    expect(tooltip).toHaveTextContent('H-1');
    expect(tooltip).toHaveTextContent('09:00');
    expect(tooltip).not.toHaveTextContent('Streaming jatuh tempo');
    fireEvent.pointerUp(reminderButton, { pointerId: 7, pointerType: 'touch' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    fireEvent.click(reminderButton);
    expect(screen.queryByRole('dialog', { name: /Notifikasi Streaming/ })).not.toBeInTheDocument();
    expect(onOpenNotifications).not.toHaveBeenCalled();
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
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
