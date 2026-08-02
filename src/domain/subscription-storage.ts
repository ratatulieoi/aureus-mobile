import type { Subscription } from '@/domain/types';
import { decodeStoredSubscriptions } from '@/domain/subscription';

export function readStoredSubscriptions(storage: { getItem(key: string): string | null }): {
  subscriptions: Subscription[];
  canPersist: boolean;
} {
  try {
    const raw = storage.getItem('subscriptions');
    if (raw === null) return { subscriptions: [], canPersist: true };
    const decoded = decodeStoredSubscriptions(JSON.parse(raw));
    return decoded === null
      ? { subscriptions: [], canPersist: false }
      : { subscriptions: decoded, canPersist: true };
  } catch {
    return { subscriptions: [], canPersist: false };
  }
}
