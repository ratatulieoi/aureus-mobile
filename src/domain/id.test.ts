import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateId, renewalTransactionId } from '@/domain/id';

describe('shared ID generation', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses browser crypto.randomUUID when available', () => {
    const uuid = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('123e4567-e89b-12d3-a456-426614174000');
    expect(generateId('tx')).toBe('tx_123e4567-e89b-12d3-a456-426614174000');
    expect(uuid).toHaveBeenCalledOnce();
  });

  it('formats lossless deterministic idempotency IDs for validated subscriptions', () => {
    expect(renewalTransactionId('sub-1', '2026-03-15')).toBe('renewal_sub-1_2026-03-15');
  });

  it('produces unique collision-resistant IDs in practical batches', () => {
    const ids = new Set(Array.from({ length: 5_000 }, () => generateId('tx')));
    expect(ids.size).toBe(5_000);
  });
});
