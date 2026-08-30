import { describe, expect, it } from 'vitest';
import {
  createDefaultCategoryCatalog,
  validateCategoryCatalog,
  validateNewCategoryName,
} from '@/domain/categories';

describe('persisted category catalog', () => {
  it('creates independent default lists and normalizes new names', () => {
    const first = createDefaultCategoryCatalog();
    const second = createDefaultCategoryCatalog();
    first.expense.push('Kendaraan');
    expect(second.expense).not.toContain('Kendaraan');
    expect(validateNewCategoryName(second, 'expense', '  Dana   sosial  ')).toEqual({ ok: true, value: 'Dana sosial' });
  });

  it('rejects duplicate and malformed categories', () => {
    const catalog = createDefaultCategoryCatalog();
    expect(validateNewCategoryName(catalog, 'expense', 'transportasi')).toEqual({ ok: false, error: 'Kategori ini sudah ada.' });
    expect(validateCategoryCatalog({ expense: ['A', 'a'], income: ['Gaji'] })).toBeNull();
    expect(validateCategoryCatalog(catalog)).toEqual(catalog);
  });

  it('accepts valid category collections larger than the former cap', () => {
    const catalog = createDefaultCategoryCatalog();
    catalog.expense.push(...Array.from({ length: 201 }, (_, index) => `Kategori ${index}`));
    expect(validateCategoryCatalog(catalog)?.expense).toHaveLength(createDefaultCategoryCatalog().expense.length + 201);
    expect(validateNewCategoryName(catalog, 'expense', 'Kategori tambahan')).toEqual({ ok: true, value: 'Kategori tambahan' });
  });
});
