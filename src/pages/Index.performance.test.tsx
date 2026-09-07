import { act, fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Index from './Index';

const renders = vi.hoisted(() => ({ home: vi.fn(), activity: vi.fn(), subs: vi.fn(), more: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock('@/components/DashboardHome', async (importOriginal) => {
  const { default: Component } = await importOriginal<typeof import('@/components/DashboardHome')>();
  return { default: (props: ComponentProps<typeof Component>) => { renders.home(); return createElement(Component, props); } };
});
vi.mock('@/components/ActivityScreen', async (importOriginal) => {
  const { default: Component } = await importOriginal<typeof import('@/components/ActivityScreen')>();
  return { default: (props: ComponentProps<typeof Component>) => { renders.activity(); return createElement(Component, props); } };
});
vi.mock('@/components/SubscriptionManager', async (importOriginal) => {
  const { default: Component } = await importOriginal<typeof import('@/components/SubscriptionManager')>();
  return { default: (props: ComponentProps<typeof Component>) => { renders.subs(); return createElement(Component, props); } };
});
vi.mock('@/components/MoreMenu', async (importOriginal) => {
  const { default: Component } = await importOriginal<typeof import('@/components/MoreMenu')>();
  return { default: (props: ComponentProps<typeof Component>) => { renders.more(); return createElement(Component, props); } };
});

describe('page content during navigation', () => {
  beforeEach(() => window.localStorage.clear());

  it.each([
    ['Home', 320, -1],
    ['Transaction', 40, 1],
    ['Subs', 320, -1],
    ['Others', 40, 1],
  ] as const)('does not rerender page content on every swipe movement from %s', async (tab, startX, direction) => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: tab }));
    if (tab === 'Subs') await screen.findByRole('heading', { name: 'Langganan' });
    const content = document.querySelector<HTMLElement>('#main-content')!;
    Object.defineProperty(content, 'clientWidth', { configurable: true, value: 400 });
    fireEvent.pointerDown(content, { pointerId: 1, pointerType: 'touch', button: 0, clientX: startX, clientY: 300 });
    await act(async () => {
      fireEvent.pointerMove(content, { pointerId: 1, pointerType: 'touch', clientX: startX + direction * 40, clientY: 300 });
    });
    expect(document.querySelectorAll('.page-swipe-layer')).toHaveLength(2);
    Object.values(renders).forEach((spy) => spy.mockClear());

    for (const distance of [60, 80, 100, 120]) {
      fireEvent.pointerMove(content, { pointerId: 1, pointerType: 'touch', clientX: startX + direction * distance, clientY: 300 });
    }
    for (const spy of Object.values(renders)) expect(spy).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLElement>('.page-swipe-layer.is-active')!.style.transform).toBe(`translate3d(${direction * 120}px, 0, 0)`);

    fireEvent.pointerCancel(content, { pointerId: 1, pointerType: 'touch' });
    fireEvent.transitionEnd(document.querySelector('.page-swipe-layer.is-active')!, { propertyName: 'transform' });
    expect(screen.getByRole('button', { name: tab })).toHaveAttribute('aria-current', 'page');
    expect(document.querySelectorAll('.page-swipe-layer')).toHaveLength(1);
  });

  it('refreshes memoized pages after saving and editing a transaction', () => {
    render(<Index />);
    fireEvent.click(screen.getByRole('button', { name: /^Makanan & Minuman,/ }));
    fireEvent.change(screen.getByLabelText('Jumlah pengeluaran'), { target: { value: '12000' } });
    fireEvent.change(screen.getByLabelText('Deskripsi'), { target: { value: 'Makan uji' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan transaksi' }));
    expect(screen.getByRole('button', { name: /^Makanan & Minuman, Rp12.000/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Transaction' }));
    fireEvent.click(screen.getByRole('button', { name: /^Edit Makan uji/ }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Kategori' }), { target: { value: 'Transportasi' } });
    fireEvent.click(screen.getByRole('button', { name: 'Simpan perubahan' }));
    expect(screen.getByRole('button', { name: /^Edit Makan uji, Transportasi/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(screen.getByRole('button', { name: /^Transportasi, Rp12.000/ })).toBeInTheDocument();
  });

  it('only mounts Home initially and still updates it when its inputs change', () => {
    render(<Index />);
    expect(renders.home).toHaveBeenCalledOnce();
    expect(renders.activity).not.toHaveBeenCalled();
    expect(renders.subs).not.toHaveBeenCalled();
    expect(renders.more).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tampilkan pemasukan' }));
    expect(renders.home).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('region', { name: 'Pilih kategori pemasukan' })).toBeInTheDocument();
  });
});
