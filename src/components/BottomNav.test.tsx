import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import BottomNav from './BottomNav';

expect.extend(toHaveNoViolations);

describe('BottomNav', () => {
  it('uses labelled section navigation with exactly one current item', async () => {
    const onTabChange = vi.fn();
    const { container } = render(<BottomNav activeTab="stats" onTabChange={onTabChange} />);

    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument();
    const current = screen.getByRole('button', { name: 'Statistik' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('button')).toHaveLength(5);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Laporan' }));
    expect(onTabChange).toHaveBeenCalledWith('reports');
    expect(await axe(container)).toHaveNoViolations();
  });
});
