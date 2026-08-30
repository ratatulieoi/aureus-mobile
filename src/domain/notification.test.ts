import { describe, expect, it } from 'vitest';
import {
  countSubscriptionNotifications,
  decodeStoredNotifications,
  formatNotificationTemplate,
  migrateLegacyNotifications,
  notificationItemLabel,
  notificationItemName,
  notificationOccurrences,
  removeNotificationsForSubscription,
  validateAndNormalizeAppNotification,
} from '@/domain/notification';
import type { AppNotification, Subscription } from '@/domain/types';

const netflix: Subscription = {
  id: 'sub-1',
  name: 'Netflix',
  amount: 59_000,
  startDate: '2026-01-01',
  cycleDays: 30,
  nextPaymentDate: '2026-09-12',
  color: 'bg-red-200 text-red-800',
};
const spotify: Subscription = { ...netflix, id: 'sub-2', name: 'Spotify', nextPaymentDate: '2026-09-20' };
const reminder: AppNotification = { id: 'note-1', title: '{name} jatuh tempo', message: 'Tagihan Rp {amount} jatuh tempo {due}.', daysBefore: 7, time: '09:00', subscriptionIds: [netflix.id, spotify.id] };

describe('notification items', () => {
  it('normalizes assignments and rejects invalid timing', () => {
    expect(validateAndNormalizeAppNotification(
      { ...reminder, subscriptionIds: [netflix.id, netflix.id, 'missing'] },
      new Set([netflix.id]),
    )).toEqual({ ok: true, value: { ...reminder, subscriptionIds: [netflix.id] } });
    expect(validateAndNormalizeAppNotification({ ...reminder, daysBefore: -1 }).ok).toBe(false);
    expect(validateAndNormalizeAppNotification({ ...reminder, time: '25:00' }).ok).toBe(false);
  });

  it('omits corrupt records and orphaned assignments during hydration', () => {
    expect(decodeStoredNotifications([
      reminder,
      { ...reminder, id: 'note-2', subscriptionIds: ['missing'] },
      { ...reminder, id: 'note-old', title: undefined, message: undefined, subscriptionIds: [] },
      { ...reminder, id: 'bad', time: 'noon' },
    ], [netflix, spotify])).toEqual([
      reminder,
      { ...reminder, id: 'note-2', subscriptionIds: [] },
      { ...reminder, id: 'note-old', title: 'Pengingat {name}', message: 'Siapkan Rp {amount} untuk {name}.', subscriptionIds: [] },
    ]);
    expect(decodeStoredNotifications({}, [netflix])).toBeNull();
  });

  it('hydrates every valid notification without a collection-size cap', () => {
    const notifications = Array.from({ length: 5_001 }, (_, index) => ({ ...reminder, id: `note-${index}` }));
    expect(decodeStoredNotifications(notifications, [netflix, spotify])).toHaveLength(5_001);
  });

  it('counts assignments and unassigns a deleted subscription without deleting the item', () => {
    expect(countSubscriptionNotifications([reminder], netflix.id)).toBe(1);
    expect(removeNotificationsForSubscription([reminder], netflix.id)).toEqual([{ ...reminder, subscriptionIds: [spotify.id] }]);
  });

  it('uses a compact timing label and formats notification templates for a subscription', () => {
    expect(notificationItemName(reminder)).toBe('H-7');
    expect(notificationItemLabel(reminder)).toBe('H-7 · 09:00');
    expect(notificationItemLabel({ ...reminder, daysBefore: 0 })).toBe('H-0 · 09:00');
    expect(formatNotificationTemplate('Bayar {name}: Rp {amount}, {due}.', reminder, netflix))
      .toBe('Bayar Netflix: Rp 59.000, 7 hari lagi.');
  });

  it('migrates linked legacy rules into reusable timing items', () => {
    const legacy = [
      { id: 'old-1', title: 'Netflix', body: '', enabled: true, schedule: { kind: 'subscription', subscriptionId: netflix.id, daysBefore: 3, time: '08:00' } },
      { id: 'old-2', title: 'Spotify', body: '', enabled: true, schedule: { kind: 'subscription', subscriptionId: spotify.id, daysBefore: 3, time: '08:00' } },
      { id: 'custom', title: 'Rent', body: '', enabled: true, schedule: { kind: 'once', date: '2026-10-01', time: '08:00' } },
    ];
    expect(migrateLegacyNotifications(legacy, [netflix, spotify])).toEqual([
      {
        id: 'old-1',
        title: 'Netflix',
        message: 'Siapkan Rp {amount} untuk {name}.',
        daysBefore: 3,
        time: '08:00',
        subscriptionIds: [netflix.id, spotify.id],
      },
    ]);
  });
});

describe('notification occurrence planning', () => {
  it('plans assigned subscriptions across future billing cycles', () => {
    const occurrences = notificationOccurrences(reminder, [netflix], new Date(2026, 8, 1, 10), 3);
    expect(occurrences.map(({ at, subscription }) => [subscription.id, at.getFullYear(), at.getMonth() + 1, at.getDate(), at.getHours()])).toEqual([
      ['sub-1', 2026, 9, 5, 9],
      ['sub-1', 2026, 10, 5, 9],
      ['sub-1', 2026, 11, 4, 9],
    ]);
  });

  it('returns no occurrences until the item is assigned', () => {
    expect(notificationOccurrences({ ...reminder, subscriptionIds: [] }, [netflix], new Date(2026, 8, 1), 3)).toEqual([]);
  });
});
