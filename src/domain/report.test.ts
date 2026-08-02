import { describe, expect, it } from 'vitest';
import { buildReportTableRows } from '@/domain/report';

describe('structured print report data', () => {
  it('preserves hostile stored strings only as cell text values', () => {
    const category = '</td><script>globalThis.pwned=true</script>';
    const description = '<img src=x onerror="globalThis.pwned=true">';
    const rows = buildReportTableRows([{
      id: 'tx-1',
      type: 'expense',
      amount: 10_000,
      category,
      description,
      date: '2026-03-15T12:00:00.000Z',
    }]);

    expect(rows[0][3]).toBe(category);
    expect(rows[0][4]).toBe(description);
    // Integration uses these values exclusively through DOM textContent.
    expect(rows).toHaveLength(1);
  });
});
