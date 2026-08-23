import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import Header from './Header';

expect.extend(toHaveNoViolations);

describe('Header navigation', () => {
  it('uses four labelled mobile sections with exactly one current item', async () => {
    const onTabChange = vi.fn();
    const { container } = render(<Header activeTab="activity" onTabChange={onTabChange} />);

    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument();
    const current = screen.getByRole('button', { name: 'Aktivitas' });
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('button')).toHaveLength(4);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Lainnya' }));
    expect(onTabChange).toHaveBeenCalledWith('more');
    expect(await axe(container)).toHaveNoViolations();
  });
});
