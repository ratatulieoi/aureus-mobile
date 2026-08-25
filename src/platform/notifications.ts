import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type PermissionStatus } from '@capacitor/local-notifications';
import type { AppNotification, NotificationPreferences, Subscription } from '@/domain/types';
import { notificationOccurrences } from '@/domain/notification';

const CHANNEL_ID = 'aureus-reminders';
const OWNED_NOTIFICATION_MIN = 100_000_000;
const OWNED_NOTIFICATION_MAX = 1_999_999_999;
const OWNED_NOTIFICATION_RANGE = OWNED_NOTIFICATION_MAX - OWNED_NOTIFICATION_MIN + 1;
const MAX_PENDING_NOTIFICATIONS = 64;

let syncQueue: Promise<void> = Promise.resolve();

export type NotificationPermission = PermissionStatus['display'] | 'unavailable';

export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (!Capacitor.isNativePlatform()) return 'unavailable';
  try {
    return (await LocalNotifications.checkPermissions()).display;
  } catch {
    return 'unavailable';
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!Capacitor.isNativePlatform()) return 'unavailable';
  return (await LocalNotifications.requestPermissions()).display;
}

export function syncLocalNotifications(
  preferences: NotificationPreferences,
  notifications: readonly AppNotification[],
  subscriptions: readonly Subscription[],
  now: Date = new Date(),
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  const snapshot = {
    preferences: { ...preferences },
    notifications: notifications.map((notification) => ({ ...notification, subscriptionIds: [...notification.subscriptionIds] })),
    subscriptions: subscriptions.map((subscription) => ({ ...subscription })),
    now: new Date(now.getTime()),
  };
  const operation = syncQueue.then(() => performNotificationSync(snapshot.preferences, snapshot.notifications, snapshot.subscriptions, snapshot.now));
  syncQueue = operation.catch(() => undefined);
  return operation;
}

async function performNotificationSync(
  preferences: NotificationPreferences,
  notifications: readonly AppNotification[],
  subscriptions: readonly Subscription[],
  now: Date,
): Promise<void> {
  const pending = await LocalNotifications.getPending();
  const owned = pending.notifications.filter(({ id }) => id >= OWNED_NOTIFICATION_MIN && id <= OWNED_NOTIFICATION_MAX);
  if (owned.length > 0) await LocalNotifications.cancel({ notifications: owned.map(({ id }) => ({ id })) });
  if (!preferences.enabled) return;

  const permission = await checkNotificationPermission();
  if (permission !== 'granted') return;

  if (Capacitor.getPlatform() === 'android') {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Pengingat Aureus',
      description: 'Pengingat jatuh tempo langganan Aureus',
      importance: 3,
      visibility: 1,
      vibration: true,
    });
  }

  const assigned = notifications.filter(({ subscriptionIds }) => subscriptionIds.length > 0);
  const perItemLimit = Math.max(1, Math.floor(MAX_PENDING_NOTIFICATIONS / Math.max(1, assigned.length)));
  const usedIds = new Set<number>();
  const scheduled = assigned.flatMap((notification) => notificationOccurrences(notification, subscriptions, now, perItemLimit)
    .map(({ at, subscription }, occurrenceIndex) => ({
      id: reserveNativeNotificationId(`${notification.id}:${subscription.id}`, occurrenceIndex, usedIds),
      title: `${subscription.name} jatuh tempo`,
      body: notification.daysBefore === 0
        ? `Tagihan Rp ${subscription.amount.toLocaleString('id-ID')} jatuh tempo hari ini.`
        : `Tagihan Rp ${subscription.amount.toLocaleString('id-ID')} jatuh tempo ${notification.daysBefore} hari lagi.`,
      schedule: { at },
      channelId: CHANNEL_ID,
      autoCancel: true,
      isExactNotification: false,
      extra: { aureusNotificationId: notification.id, subscriptionId: subscription.id },
    })))
    .sort((left, right) => left.schedule.at.getTime() - right.schedule.at.getTime())
    .slice(0, MAX_PENDING_NOTIFICATIONS);

  if (scheduled.length > 0) await LocalNotifications.schedule({ notifications: scheduled });
}

function reserveNativeNotificationId(id: string, occurrenceIndex: number, usedIds: Set<number>): number {
  let candidate = nativeNotificationId(id, occurrenceIndex);
  while (usedIds.has(candidate)) {
    candidate = candidate === OWNED_NOTIFICATION_MAX ? OWNED_NOTIFICATION_MIN : candidate + 1;
  }
  usedIds.add(candidate);
  return candidate;
}

export function nativeNotificationId(id: string, occurrenceIndex = 0): number {
  const source = `${id}:${occurrenceIndex}`;
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return OWNED_NOTIFICATION_MIN + ((hash >>> 0) % OWNED_NOTIFICATION_RANGE);
}
