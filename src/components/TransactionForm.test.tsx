import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import TransactionForm from './TransactionForm';

expect.extend(toHaveNoViolations);

async function completeForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Jumlah (Rp) *'), '15000');
  await user.type(screen.getByLabelText('Keterangan *'), 'Makan siang');
  await user.click(screen.getByLabelText('Tipe Transaksi *'));
  await user.click(screen.getByRole('option', { name: 'Pengeluaran' }));
  await user.click(screen.getByLabelText('Kategori *'));
  await user.click(screen.getByRole('option', { name: 'Makanan & Minuman' }));
}

function FormHarness({ onAddTransaction = () => true }: { onAddTransaction?: () => boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Buka transaksi</button>
      {open && <TransactionForm onAddTransaction={onAddTransaction} onClose={() => setOpen(false)} />}
    </>
  );
}

describe('TransactionForm dialog', () => {
  it('exposes dialog semantics, labelled fields, initial focus, Escape dismissal, and focus return', async () => {
    const user = userEvent.setup();
    const { container } = render(<FormHarness />);
    const trigger = screen.getByRole('button', { name: 'Buka transaksi' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Tambah Transaksi' });
    expect(dialog).toHaveAccessibleDescription();
    expect(document.activeElement).not.toBe(screen.getByLabelText('Tanggal *'));
    expect(screen.getByLabelText('Tipe Transaksi *')).toBeInTheDocument();
    expect(screen.getByLabelText('Kategori *')).toBeInTheDocument();
    expect(screen.getByLabelText('Jumlah (Rp) *')).toBeInTheDocument();
    expect(screen.getByLabelText('Keterangan *')).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('traps Tab focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(<TransactionForm onAddTransaction={() => true} onClose={() => undefined} />);
    const dialog = screen.getByRole('dialog', { name: 'Tambah Transaksi' });
    for (let index = 0; index < 12; index += 1) {
      await user.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it('commits once and blocks duplicate submit and dismissal while saving', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn(() => true);
    const onClose = vi.fn();
    render(<TransactionForm onAddTransaction={onAddTransaction} onClose={onClose} />);
    await completeForm(user);

    await user.dblClick(screen.getByRole('button', { name: 'Simpan Transaksi' }));
    expect(onAddTransaction).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Menyimpan...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Batal' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Tutup formulir transaksi' })).not.toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });
});
