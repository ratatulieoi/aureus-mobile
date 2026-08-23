import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import Index from './Index';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

expect.extend(toHaveNoViolations);

describe('Index mobile navigation and dashboard', () => {
  it('switches transaction emphasis and exposes the activity period controls', async () => {
    const user = userEvent.setup();
    render(<Index />);

    const income = screen.getByRole('button', { name: 'Tampilkan pemasukan' });
    await user.click(income);
    expect(screen.getByRole('button', { name: 'Tampilkan pengeluaran' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Kategori pemasukan' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Aktivitas' }));
    expect(screen.getByRole('button', { name: 'Aktivitas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Bulan')).toBeEnabled();
    expect(screen.getByLabelText('Tahun')).toBeEnabled();
  });

  it('has no axe violations on the representative home page', async () => {
    const { container } = render(<Index />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
