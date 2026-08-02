import { describe, expect, it } from 'vitest';
import { readStoredSubscriptions } from '@/domain/subscription-storage';

describe('subscription storage reads', () => {
  it('handles unavailable localStorage without throwing at startup', () => {
    expect(readStoredSubscriptions({
      getItem: () => { throw new DOMException('blocked', 'SecurityError'); },
    })).toEqual({ subscriptions: [], canPersist: false });
  });

  it('does not permit overwrite after malformed persisted JSON', () => {
    expect(readStoredSubscriptions({ getItem: () => '{bad' }))
      .toEqual({ subscriptions: [], canPersist: false });
  });
});
