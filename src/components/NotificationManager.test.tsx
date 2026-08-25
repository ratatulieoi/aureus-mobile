import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import NotificationManager from './NotificationManager';
import type { AppNotification, NotificationPreferences, Subscription } from '@/domain/types';

const permissionMock = vi.hoisted(() => ({ check: vi.fn(), request: vi.fn() }));
vi.mock('@/platform/notifications', () => ({
  checkNotificationPermission: permissionMock.check,
  requestNotificationPermission: permissionMock.request,
}));

expect.extend(toHaveNoViolations);

const subscriptions: Subscription[] = [
  { id: 'sub-1', name: 'Netflix', amount: 59_000, startDate: '2026-01-01', cycleDays: 30, nextPaymentDate: '2026-09-12', color: 'red' },
  { id: 'sub-2', name: 'Spotify', amount: 54_000, startDate: '2026-01-01', cycleDays: 30, nextPaymentDate: '2026-09-14', color: 'green' },
];

const Harness = ({ initial = [], availableSubscriptions = subscriptions }: { initial?: AppNotification[]; availableSubscriptions?: Subscription[] }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(initial);
  const [preferences, setPreferences] = useState<NotificationPreferences>({ enabled: false });
  return <NotificationManager notifications={notifications} preferences={preferences} subscriptions={availableSubscriptions} onNotificationsChange={setNotifications} onPreferencesChange={setPreferences} />;
};

describe('Notification manager', () => {
  it('requests device permission only when the master switch is turned on', async () => {
    permissionMock.check.mockResolvedValue('prompt');
    permissionMock.request.mockResolvedValue('granted');
    const user = userEvent.setup();
    render(<Harness />);

    expect(permissionMock.request).not.toHaveBeenCalled();
    await user.click(screen.getByRole('switch', { name: 'Notifikasi perangkat' }));
    expect(permissionMock.check).toHaveBeenCalledOnce();
    expect(permissionMock.request).toHaveBeenCalledOnce();
    expect(screen.getByRole('switch', { name: 'Notifikasi perangkat' })).toHaveAttribute('aria-checked', 'true');
  });

  it('creates a two-field item and opens subscription assignment', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Tambah' }));
    const editor = screen.getByRole('dialog', { name: 'Tambah notifikasi' });
    expect(within(editor).getByLabelText('Hari sebelum')).toHaveValue(3);
    expect(within(editor).getByLabelText('Waktu')).toHaveValue('08:00');
    expect(within(editor).getByLabelText('Waktu')).toHaveAttribute('type', 'text');
    expect(within(editor).getByLabelText('Waktu')).toHaveAttribute('pattern', '([01][0-9]|2[0-3]):[0-5][0-9]');
    expect(within(editor).queryByLabelText('Judul')).not.toBeInTheDocument();
    await user.click(within(editor).getByRole('button', { name: 'Simpan' }));

    const assignment = screen.getByRole('dialog', { name: 'H-3' });
    expect(within(assignment).getByRole('checkbox', { name: /Netflix/ })).not.toBeChecked();
    await user.click(within(assignment).getByRole('checkbox', { name: /Netflix/ }));
    expect(within(assignment).getByRole('checkbox', { name: /Netflix/ })).toBeChecked();
    expect(screen.getByText('1 langganan')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('assigns one item to several subscriptions and edits only its timing', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ id: 'note-1', daysBefore: 3, time: '08:00', subscriptionIds: [] }]} />);

    await user.click(screen.getByRole('button', { name: /H-3/ }));
    const assignment = screen.getByRole('dialog', { name: 'H-3' });
    await user.click(within(assignment).getByRole('checkbox', { name: /Netflix/ }));
    await user.click(within(assignment).getByRole('checkbox', { name: /Spotify/ }));
    await user.click(within(assignment).getByRole('button', { name: 'Ubah waktu' }));

    const editor = screen.getByRole('dialog', { name: 'Ubah waktu' });
    const days = within(editor).getByLabelText('Hari sebelum');
    await user.clear(days);
    await user.type(days, '1');
    await user.click(within(editor).getByRole('button', { name: 'Simpan' }));
    expect(screen.getByRole('button', { name: /H-1/ })).toHaveTextContent('2 langganan');
    expect(screen.getByRole('button', { name: /H-1/ })).toHaveTextContent('08:00');
  });

  it('shows a clear assignment state when no subscriptions exist', async () => {
    const user = userEvent.setup();
    render(<Harness initial={[{ id: 'note-1', daysBefore: 3, time: '08:00', subscriptionIds: [] }]} availableSubscriptions={[]} />);
    await user.click(screen.getByRole('button', { name: /H-3/ }));
    expect(screen.getByText('Belum ada langganan')).toBeInTheDocument();
  });
});
