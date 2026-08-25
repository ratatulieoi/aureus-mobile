import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppNotification, Subscription } from '@/domain/types';

const nativeMock = vi.hoisted(() => ({
  getPending: vi.fn(),
  cancel: vi.fn(),
  createChannel: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  schedule: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' } }));
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: nativeMock }));

import { checkNotificationPermission, requestNotificationPermission, syncLocalNotifications } from '@/platform/notifications';

const subscriptions: Subscription[] = [
  { id: 'sub-1', name: 'Netflix', amount: 59_000, startDate: '2026-01-01', cycleDays: 30, nextPaymentDate: '2026-09-12', color: 'red' },
  { id: 'sub-2', name: 'Spotify', amount: 54_000, startDate: '2026-01-01', cycleDays: 30, nextPaymentDate: '2026-09-14', color: 'green' },
];
const notification: AppNotification = { id: 'note-1', daysBefore: 7, time: '09:00', subscriptionIds: ['sub-1', 'sub-2'] };

beforeEach(() => {
  vi.clearAllMocks();
  nativeMock.getPending.mockResolvedValue({ notifications: [] });
  nativeMock.cancel.mockResolvedValue(undefined);
  nativeMock.createChannel.mockResolvedValue(undefined);
  nativeMock.checkPermissions.mockResolvedValue({ display: 'granted' });
  nativeMock.requestPermissions.mockResolvedValue({ display: 'granted' });
  nativeMock.schedule.mockResolvedValue({ notifications: [] });
});

describe('native notification adapter', () => {
  it('checks permission without requesting it and only requests through the explicit method', async () => {
    expect(await checkNotificationPermission()).toBe('granted');
    expect(nativeMock.requestPermissions).not.toHaveBeenCalled();
    expect(await requestNotificationPermission()).toBe('granted');
    expect(nativeMock.requestPermissions).toHaveBeenCalledOnce();
  });

  it('schedules assigned subscriptions without exact-alarm access', async () => {
    await syncLocalNotifications({ enabled: true }, [notification], subscriptions, new Date(2026, 8, 1, 10));

    expect(nativeMock.requestPermissions).not.toHaveBeenCalled();
    expect(nativeMock.schedule).toHaveBeenCalledOnce();
    const scheduled = nativeMock.schedule.mock.calls[0][0].notifications;
    expect(scheduled).toHaveLength(64);
    expect(scheduled.every((item: { isExactNotification: boolean }) => item.isExactNotification === false)).toBe(true);
    expect(scheduled.some((item: { title: string }) => item.title === 'Netflix jatuh tempo')).toBe(true);
    expect(scheduled.some((item: { title: string }) => item.title === 'Spotify jatuh tempo')).toBe(true);
  });

  it('serializes rapid reschedules', async () => {
    let releaseFirstPending: (() => void) | undefined;
    nativeMock.getPending
      .mockImplementationOnce(() => new Promise((resolve) => { releaseFirstPending = () => resolve({ notifications: [] }); }))
      .mockResolvedValueOnce({ notifications: [] });

    const first = syncLocalNotifications({ enabled: true }, [notification], subscriptions, new Date(2026, 8, 1, 10));
    const second = syncLocalNotifications({ enabled: true }, [{ ...notification, daysBefore: 1 }], subscriptions, new Date(2026, 8, 1, 10));
    await Promise.resolve();
    expect(nativeMock.getPending).toHaveBeenCalledOnce();
    releaseFirstPending?.();
    await Promise.all([first, second]);
    expect(nativeMock.schedule).toHaveBeenCalledTimes(2);
  });

  it('cancels owned schedules when the master setting is off', async () => {
    nativeMock.getPending.mockResolvedValue({ notifications: [{ id: 100_000_001 }, { id: 99 }] });
    await syncLocalNotifications({ enabled: false }, [notification], subscriptions);
    expect(nativeMock.cancel).toHaveBeenCalledWith({ notifications: [{ id: 100_000_001 }] });
    expect(nativeMock.schedule).not.toHaveBeenCalled();
  });
});
