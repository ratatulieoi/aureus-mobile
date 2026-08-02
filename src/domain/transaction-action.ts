export type TransactionCommit = () => boolean;

/**
 * Synchronous save gate shared by manual, voice, and subscription actions.
 * `busy` must be set before invoking commit to block re-entrant/double clicks;
 * a failed commit resets it so controls remain retryable.
 */
export function attemptTransactionCommit(
  busy: { current: boolean },
  commit: TransactionCommit,
): boolean {
  if (busy.current) return false;
  busy.current = true;
  try {
    const succeeded = commit();
    if (!succeeded) busy.current = false;
    return succeeded;
  } catch {
    busy.current = false;
    return false;
  }
}
