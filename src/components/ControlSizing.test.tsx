import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastViewport } from '@/components/ui/toast';

describe('shared control sizing', () => {
  it('keeps default, small, and cancel controls at least 44 CSS px high', () => {
    render(<><Button>Default</Button><Button size="sm">Small</Button><Button variant="outline">Cancel</Button></>);
    for (const button of screen.getAllByRole('button')) expect(button.className).toMatch(/h-11|min-h-11/);
  });

  it('uses practical mobile select item and scroll target classes', () => {
    render(<Select open value="one"><SelectTrigger aria-label="Pilihan"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="one">Satu</SelectItem><SelectItem value="two">Dua</SelectItem></SelectContent></Select>);
    expect(screen.getByRole('option', { name: 'Satu' })).toHaveClass('min-h-11');
  });

  it('keeps toast close named, visible, and 44px', () => {
    render(<ToastProvider><Toast open><ToastDescription>Pesan</ToastDescription><ToastClose /></Toast><ToastViewport /></ToastProvider>);
    const close = screen.getByRole('button', { name: 'Tutup notifikasi' });
    expect(close).toHaveClass('h-11', 'w-11');
    expect(close).not.toHaveClass('opacity-0');
  });
});
