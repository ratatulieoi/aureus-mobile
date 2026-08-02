function secureRandomBytes(length: number): Uint8Array {
  const cryptoObject = globalThis.crypto;
  if (!cryptoObject?.getRandomValues) {
    throw new Error('Secure random ID generation is unavailable');
  }
  return cryptoObject.getRandomValues(new Uint8Array(length));
}

export function generateId(prefix = 'tx'): string {
  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.randomUUID) return `${prefix}_${cryptoObject.randomUUID()}`;

  // Older WebViews may lack randomUUID while still providing cryptographically
  // secure getRandomValues. This is the only fallback; weak Math.random IDs are
  // intentionally not generated for financial records.
  const bytes = secureRandomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${prefix}_${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function renewalTransactionId(subscriptionId: string, dueDate: string): string {
  // Subscription validation admits only the shared safe ID alphabet and caps
  // its length so this lossless occurrence ID fits the transaction ID bound.
  return `renewal_${subscriptionId}_${dueDate}`;
}
