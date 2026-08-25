import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Header from './Header';

expect.extend(toHaveNoViolations);

describe('Header utility menu', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.className = '';
  });

  it('keeps the Aureus lockup visible and opens the utility actions from the three-dot button', async () => {
    const user = userEvent.setup();
    const onOpenMore = vi.fn();
    const onOpenBackup = vi.fn();
    const { container } = render(<Header onOpenMore={onOpenMore} onOpenBackup={onOpenBackup} />);

    expect(screen.getByLabelText('Aureus')).toHaveTextContent('Aureus');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Buka menu Aureus' }));
    expect(screen.getByRole('menu', { name: 'Menu Aureus' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Ganti tema/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Backup & pulihkan/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Others/ })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: /Backup & pulihkan/ }));
    expect(onOpenBackup).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('changes the shared theme from the utility menu', async () => {
    const user = userEvent.setup();
    render(<Header onOpenMore={vi.fn()} onOpenBackup={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Buka menu Aureus' }));
    await user.click(screen.getByRole('menuitem', { name: /Ganti tema/ }));

    expect(document.documentElement).toHaveClass('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
  });
});
