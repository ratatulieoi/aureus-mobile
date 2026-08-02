import { describe, expect, it } from 'vitest';
import { escapeCsvCell, neutralizeSpreadsheetFormula, serializeCsvRows } from '@/domain/csv';

describe('standards-compliant CSV serialization', () => {
  it('uses RFC 4180 escaping for commas, quotes, CR, LF, and CRLF rows', () => {
    expect(serializeCsvRows([
      ['Kategori', 'Keterangan'],
      ['Makanan, Minuman', 'kata "dikutip"'],
      ['LF', 'baris satu\nbaris dua'],
      ['CR', 'baris satu\rbaris dua'],
    ])).toBe(
      'Kategori,Keterangan\r\n' +
      '"Makanan, Minuman","kata ""dikutip"""\r\n' +
      'LF,"baris satu\nbaris dua"\r\n' +
      'CR,"baris satu\rbaris dua"',
    );
  });

  it.each(['=2+2', '+SUM(A1:A2)', '-1+2', '@cmd', ' =1+1', '\t@SUM(A:A)', '\r\n+1', '\u00a0=1+1'])(
    'neutralizes formula-like text %j', (value) => {
      expect(neutralizeSpreadsheetFormula(value)).toBe(`'${value}`);
    },
  );

  it('does not alter ordinary text or numeric/currency fields', () => {
    expect(escapeCsvCell('Rp 10.000')).toBe('Rp 10.000');
    expect(escapeCsvCell('Keterangan biasa')).toBe('Keterangan biasa');
    expect(escapeCsvCell(100000)).toBe('100000');
  });

  it('quotes a tab-leading formula after neutralizing it', () => {
    expect(escapeCsvCell('\t=HYPERLINK("https://example.invalid")'))
      .toBe('"\'\t=HYPERLINK(""https://example.invalid"")"');
  });
});
