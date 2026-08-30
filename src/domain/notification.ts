import { addCalendarDays, parseLocalCalendarDate } from '@/domain/calendar-date';
import { isValidIdentifier } from '@/domain/transaction-validation';
import type { AppNotification, NotificationPreferences, Subscription } from '@/domain/types';

export const MAX_NOTIFICATION_DAYS_BEFORE = 36_600;
export const MAX_NOTIFICATION_TITLE_LENGTH = 100;
export const MAX_NOTIFICATION_MESSAGE_LENGTH = 500;
export const DEFAULT_NOTIFICATION_TITLE = 'Pengingat {name}';
export const DEFAULT_NOTIFICATION_MESSAGE = 'Siapkan Rp {amount} untuk {name}.';
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = { enabled: false };

export type NotificationValidationResult =
  | { ok: true; value: AppNotification }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeTime(value: unknown): string | null {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : null;
}

function normalizeNotificationText(value: unknown, fallback: string, maxLength: number): string | null {
  if (value === undefined) return fallback;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

export function validateAndNormalizeAppNotification(
  value: unknown,
  subscriptionIds: ReadonlySet<string> | null = null,
): NotificationValidationResult {
  if (!isRecord(value)) return { ok: false, error: 'Notifikasi harus berupa objek' };
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  if (!isValidIdentifier(id)) return { ok: false, error: 'ID notifikasi tidak valid' };
  if (!Number.isSafeInteger(value.daysBefore) || (value.daysBefore as number) < 0 || (value.daysBefore as number) > MAX_NOTIFICATION_DAYS_BEFORE) {
    return { ok: false, error: 'Jumlah hari tidak valid' };
  }
  const title = normalizeNotificationText(value.title, DEFAULT_NOTIFICATION_TITLE, MAX_NOTIFICATION_TITLE_LENGTH);
  if (!title) return { ok: false, error: 'Judul notifikasi tidak valid' };
  const message = normalizeNotificationText(value.message, DEFAULT_NOTIFICATION_MESSAGE, MAX_NOTIFICATION_MESSAGE_LENGTH);
  if (!message) return { ok: false, error: 'Pesan notifikasi tidak valid' };
  const time = normalizeTime(value.time);
  if (!time) return { ok: false, error: 'Waktu notifikasi tidak valid' };
  if (!Array.isArray(value.subscriptionIds)) return { ok: false, error: 'Daftar langganan tidak valid' };
  const normalizedIds: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value.subscriptionIds) {
    const subscriptionId = typeof candidate === 'string' ? candidate.trim() : '';
    if (!isValidIdentifier(subscriptionId) || (subscriptionIds && !subscriptionIds.has(subscriptionId))) continue;
    if (!seen.has(subscriptionId)) {
      seen.add(subscriptionId);
      normalizedIds.push(subscriptionId);
    }
  }
  return { ok: true, value: { id, title, message, daysBefore: value.daysBefore as number, time, subscriptionIds: normalizedIds } };
}

export function decodeStoredNotifications(
  value: unknown,
  subscriptions: readonly Subscription[],
): AppNotification[] | null {
  if (!Array.isArray(value)) return null;
  const subscriptionIds = new Set(subscriptions.map(({ id }) => id));
  const ids = new Set<string>();
  const notifications: AppNotification[] = [];
  for (const candidate of value) {
    const result = validateAndNormalizeAppNotification(candidate, subscriptionIds);
    if (!result.ok || ids.has(result.value.id)) continue;
    ids.add(result.value.id);
    notifications.push(result.value);
  }
  for (const migrated of migrateLegacyNotifications(value, subscriptions)) {
    const duplicateTiming = notifications.find((notification) => notification.daysBefore === migrated.daysBefore && notification.time === migrated.time);
    if (duplicateTiming) {
      duplicateTiming.subscriptionIds = Array.from(new Set([...duplicateTiming.subscriptionIds, ...migrated.subscriptionIds]));
    } else if (!ids.has(migrated.id)) {
      ids.add(migrated.id);
      notifications.push(migrated);
    }
  }
  return notifications;
}

export function migrateLegacyNotifications(
  value: unknown,
  subscriptions: readonly Subscription[],
): AppNotification[] {
  if (!Array.isArray(value)) return [];
  const subscriptionIds = new Set(subscriptions.map(({ id }) => id));
  const byTiming = new Map<string, AppNotification>();
  const usedIds = new Set<string>();
  for (const candidate of value) {
    if (!isRecord(candidate) || !isRecord(candidate.schedule) || candidate.schedule.kind !== 'subscription') continue;
    const subscriptionId = typeof candidate.schedule.subscriptionId === 'string' ? candidate.schedule.subscriptionId.trim() : '';
    const daysBefore = candidate.schedule.daysBefore;
    const time = normalizeTime(candidate.schedule.time);
    if (!subscriptionIds.has(subscriptionId) || !Number.isSafeInteger(daysBefore) || (daysBefore as number) < 0 || (daysBefore as number) > MAX_NOTIFICATION_DAYS_BEFORE || !time) continue;
    const key = `${daysBefore}:${time}`;
    const existing = byTiming.get(key);
    if (existing) {
      if (!existing.subscriptionIds.includes(subscriptionId)) existing.subscriptionIds.push(subscriptionId);
      continue;
    }
    let id = typeof candidate.id === 'string' && isValidIdentifier(candidate.id.trim()) ? candidate.id.trim() : `note-migrated-${byTiming.size + 1}`;
    while (usedIds.has(id)) id = `${id}-${usedIds.size + 1}`;
    usedIds.add(id);
    const title = normalizeNotificationText(candidate.title, DEFAULT_NOTIFICATION_TITLE, MAX_NOTIFICATION_TITLE_LENGTH) ?? DEFAULT_NOTIFICATION_TITLE;
    const legacyBody = 'body' in candidate ? candidate.body : undefined;
    const message = legacyBody === ''
      ? DEFAULT_NOTIFICATION_MESSAGE
      : normalizeNotificationText(legacyBody, DEFAULT_NOTIFICATION_MESSAGE, MAX_NOTIFICATION_MESSAGE_LENGTH) ?? DEFAULT_NOTIFICATION_MESSAGE;
    byTiming.set(key, { id, title, message, daysBefore: daysBefore as number, time, subscriptionIds: [subscriptionId] });
  }
  return Array.from(byTiming.values());
}

export function decodeNotificationPreferences(value: unknown): NotificationPreferences | null {
  return isRecord(value) && typeof value.enabled === 'boolean' ? { enabled: value.enabled } : null;
}

export function removeNotificationsForSubscription(
  notifications: readonly AppNotification[],
  subscriptionId: string,
): AppNotification[] {
  return notifications.map((notification) => ({
    ...notification,
    subscriptionIds: notification.subscriptionIds.filter((id) => id !== subscriptionId),
  }));
}

export function countSubscriptionNotifications(notifications: readonly AppNotification[], subscriptionId: string): number {
  return notifications.filter(({ subscriptionIds }) => subscriptionIds.includes(subscriptionId)).length;
}

export function notificationItemName(notification: AppNotification): string {
  return `H-${notification.daysBefore}`;
}

export function notificationItemLabel(notification: AppNotification): string {
  return `${notificationItemName(notification)} · ${notification.time}`;
}

export function formatNotificationTemplate(
  template: string,
  notification: AppNotification,
  subscription: Subscription,
): string {
  const due = notification.daysBefore === 0 ? 'hari ini' : `${notification.daysBefore} hari lagi`;
  const replacements: Record<string, string> = {
    '{name}': subscription.name,
    '{amount}': subscription.amount.toLocaleString('id-ID'),
    '{due}': due,
  };
  return Object.entries(replacements).reduce(
    (text, [placeholder, replacement]) => text.split(placeholder).join(replacement),
    template,
  );
}

export interface NotificationOccurrence {
  at: Date;
  notificationId: string;
  subscription: Subscription;
}

export function notificationOccurrences(
  notification: AppNotification,
  subscriptions: readonly Subscription[],
  now: Date = new Date(),
  limit = 24,
): NotificationOccurrence[] {
  if (Number.isNaN(now.getTime()) || !Number.isSafeInteger(limit) || limit < 1) return [];
  const assigned = subscriptions.filter(({ id }) => notification.subscriptionIds.includes(id));
  if (assigned.length === 0) return [];
  const occurrences: NotificationOccurrence[] = [];
  for (const subscription of assigned) {
    let dueDate = subscription.nextPaymentDate;
    let subscriptionOccurrences = 0;
    for (let iteration = 0; iteration < limit + 2 && subscriptionOccurrences < limit; iteration += 1) {
      const date = addCalendarDays(dueDate, -notification.daysBefore);
      const at = date ? futureLocalDateTime(date, notification.time, now) : null;
      if (at) {
        occurrences.push({ at, notificationId: notification.id, subscription });
        subscriptionOccurrences += 1;
      }
      dueDate = addCalendarDays(dueDate, subscription.cycleDays) ?? dueDate;
    }
  }
  return occurrences.sort((left, right) => left.at.getTime() - right.at.getTime()).slice(0, limit);
}

function futureLocalDateTime(date: string, time: string, now: Date): Date | null {
  const day = parseLocalCalendarDate(date);
  if (!day) return null;
  const [hour, minute] = time.split(':').map(Number);
  day.setHours(hour, minute, 0, 0);
  return day.getTime() > now.getTime() ? day : null;
}
