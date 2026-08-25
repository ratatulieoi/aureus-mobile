import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import CategoryManager from './CategoryManager';
import type { CategoryCatalog } from '@/domain/types';

expect.extend(toHaveNoViolations);

const categories: CategoryCatalog = {
  expense: ['Belanja', 'Tagihan'],
  income: ['Gaji'],
};

describe('Category manager', () => {
  it('shows one category type at a time and preserves a clear add flow', async () => {
    const user = userEvent.setup();
    const onCategoriesChange = vi.fn();
    const { container } = render(<CategoryManager categories={categories} onCategoriesChange={onCategoriesChange} />);

    expect(screen.getByRole('button', { name: /Pengeluaran/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Belanja')).toBeInTheDocument();
    expect(screen.queryByText('Gaji')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Pemasukan/ }));
    expect(screen.getByRole('button', { name: /Pemasukan/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Gaji')).toBeInTheDocument();
    expect(screen.queryByText('Belanja')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(screen.getByRole('dialog', { name: 'Tambah kategori' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nama kategori')).toHaveFocus();
    await user.type(screen.getByLabelText('Nama kategori'), 'Komisi');
    await user.click(screen.getByRole('button', { name: 'Tambah kategori' }));
    expect(onCategoriesChange).toHaveBeenCalledWith({ expense: ['Belanja', 'Tagihan'], income: ['Gaji', 'Komisi'] });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('offers a useful action when the selected type is empty', () => {
    render(<CategoryManager categories={{ expense: [], income: ['Gaji'] }} onCategoriesChange={vi.fn()} />);
    expect(screen.getByText('Belum ada kategori pengeluaran')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tambah kategori' })).toBeEnabled();
  });
});
