import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: 'Tampilkan pengeluaran' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Tampilkan pemasukan' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Pilih kategori pemasukan' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByLabelText('Periode')).toBeEnabled();
    expect(screen.getByLabelText('Cari transaksi')).toBeEnabled();
    expect(screen.queryByText('Buku Besar')).not.toBeInTheDocument();
  });

  it('moves between adjacent pages with a deliberate horizontal touch swipe', () => {
    render(<Index />);
    const content = document.querySelector<HTMLElement>('#main-content');
    if (!content) throw new Error('main content not found');
    Object.defineProperty(content, 'clientWidth', { configurable: true, value: 400 });

    fireEvent.pointerDown(content, { pointerId: 1, pointerType: 'touch', button: 0, clientX: 340, clientY: 300 });
    fireEvent.pointerMove(content, { pointerId: 1, pointerType: 'touch', clientX: 190, clientY: 306 });
    expect(document.querySelectorAll('.page-swipe-layer')).toHaveLength(2);
    fireEvent.pointerUp(content, { pointerId: 1, pointerType: 'touch', clientX: 190, clientY: 306 });
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    fireEvent.transitionEnd(document.querySelector('.page-swipe-layer.is-active') as HTMLElement, { propertyName: 'transform' });
    expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute('aria-current', 'page');

    fireEvent.pointerDown(content, { pointerId: 2, pointerType: 'touch', button: 0, clientX: 40, clientY: 300 });
    fireEvent.pointerUp(content, { pointerId: 2, pointerType: 'touch', clientX: 170, clientY: 303 });
    expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute('aria-current', 'page');
    fireEvent.transitionEnd(document.querySelector('.page-swipe-layer.is-active') as HTMLElement, { propertyName: 'transform' });
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps vertical movement on the current page and accepts a swipe starting on a form control', async () => {
    const user = userEvent.setup();
    render(<Index />);
    const content = document.querySelector<HTMLElement>('#main-content');
    if (!content) throw new Error('main content not found');
    Object.defineProperty(content, 'clientWidth', { configurable: true, value: 400 });

    fireEvent.pointerDown(content, { pointerId: 3, pointerType: 'touch', button: 0, clientX: 320, clientY: 100 });
    fireEvent.pointerUp(content, { pointerId: 3, pointerType: 'touch', clientX: 220, clientY: 260 });
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'History' }));
    const search = screen.getByLabelText('Cari transaksi');
    fireEvent.pointerDown(search, { pointerId: 4, pointerType: 'touch', button: 0, clientX: 150, clientY: 180 });
    fireEvent.pointerUp(search, { pointerId: 4, pointerType: 'touch', clientX: 320, clientY: 182 });
    expect(screen.getByRole('button', { name: 'History' })).toHaveAttribute('aria-current', 'page');
    fireEvent.transitionEnd(document.querySelector('.page-swipe-layer.is-active') as HTMLElement, { propertyName: 'transform' });
    expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens Backup directly and keeps Lainnya available as a primary destination', async () => {
    const user = userEvent.setup();
    render(<Index />);

    await user.click(screen.getByRole('button', { name: 'Buka menu Aureus' }));
    await user.click(screen.getByRole('menuitem', { name: /Backup & pulihkan/ }));
    expect(await screen.findByRole('heading', { name: 'Backup & Restore' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lainnya' })).toHaveAttribute('aria-current', 'page');

    await user.click(screen.getByRole('button', { name: 'Buka menu Aureus' }));
    await user.click(screen.getByRole('menuitem', { name: /^Lainnya/ }));
    expect(await screen.findByRole('heading', { name: 'Lainnya' })).toBeInTheDocument();
  });

  it('has no axe violations on the representative home page', async () => {
    const { container } = render(<Index />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
