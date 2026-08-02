import { describe, expect, it, vi } from 'vitest';
import { attemptTransactionCommit } from '@/domain/transaction-action';

describe('transaction commit control', () => {
  it('blocks re-entrant and duplicate successful commits', () => {
    const busy = { current: false };
    const commit = vi.fn(() => true);
    expect(attemptTransactionCommit(busy, commit)).toBe(true);
    expect(attemptTransactionCommit(busy, commit)).toBe(false);
    expect(commit).toHaveBeenCalledOnce();
  });

  it('resets the guard after explicit failure so a retry can succeed', () => {
    const busy = { current: false };
    expect(attemptTransactionCommit(busy, () => false)).toBe(false);
    expect(busy.current).toBe(false);
    expect(attemptTransactionCommit(busy, () => true)).toBe(true);
  });

  it('resets the guard when the callback throws', () => {
    const busy = { current: false };
    expect(attemptTransactionCommit(busy, () => { throw new Error('failure'); })).toBe(false);
    expect(busy.current).toBe(false);
  });
});
