import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import BottomNav from './BottomNav';

expect.extend(toHaveNoViolations);

describe('Bottom navigation', () => {
  it('orders four destinations before a separate add action', async () => {
    const onTabChange = vi.fn();
    const { container } = render(<BottomNav activeTab="activity" onTabChange={onTabChange} />);

    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').map(({ textContent, ariaLabel }) => textContent?.trim() || ariaLabel)).toEqual([
      'Home',
      'History',
      'Subs',
      'Lainnya',
      'Tambah transaksi',
    ]);
    expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('button').map(({ className }) => className)).not.toContain(expect.stringContaining('is-active'));
    expect(screen.getByRole('button', { name: 'Tambah transaksi' })).toBeDisabled();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Lainnya' }));
    expect(onTabChange).toHaveBeenCalledWith('more');
    expect(await axe(container)).toHaveNoViolations();
  });
});
