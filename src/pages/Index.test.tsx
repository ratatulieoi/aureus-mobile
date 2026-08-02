import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import Index from './Index';

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

expect.extend(toHaveNoViolations);

describe('Index navigation and All-Time state', () => {
  it('announces the active section and exposes truly disabled period controls in All-Time mode', async () => {
    const user = userEvent.setup();
    render(<Index />);

    await user.click(screen.getByRole('button', { name: 'Aktifkan ringkasan All-Time' }));
    await user.click(screen.getByRole('button', { name: 'Statistik' }));

    expect(screen.getByRole('button', { name: 'Statistik' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Bulan statistik')).toBeDisabled();
    expect(screen.getByLabelText('Tahun statistik')).toBeDisabled();
    expect(screen.getByText('Mode All-Time aktif. Pilihan bulan dan tahun tidak berlaku.')).toHaveAttribute('role', 'status');
    expect(await screen.findByText('Tren Bulanan (All-Time)', {}, { timeout: 5_000 })).toBeInTheDocument();
  });

  it('has no axe violations on the full representative home page', async () => {
    const { container } = render(<Index />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
