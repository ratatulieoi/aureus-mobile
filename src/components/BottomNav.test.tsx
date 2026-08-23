import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import BottomNav from './BottomNav';

expect.extend(toHaveNoViolations);

describe('Bottom navigation', () => {
  it('uses Subs, mark-only Home, and History with exactly one current destination', async () => {
    const onTabChange = vi.fn();
    const { container } = render(<BottomNav activeTab="activity" onTabChange={onTabChange} />);

    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('button').map(({ className }) => className)).not.toContain(expect.stringContaining('is-active'));
    expect(screen.getByRole('button', { name: 'Home' })).not.toHaveTextContent('Home');
    expect(screen.getAllByRole('button')).toHaveLength(3);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Subs' }));
    expect(onTabChange).toHaveBeenCalledWith('subs');
    expect(await axe(container)).toHaveNoViolations();
  });
});
