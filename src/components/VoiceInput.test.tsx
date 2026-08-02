import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, describe, it, vi } from 'vitest';
import VoiceInput from './VoiceInput';

expect.extend(toHaveNoViolations);

class FakeSpeechRecognition {
  static latest: FakeSpeechRecognition | null = null;
  continuous = false;
  interimResults = false;
  lang = '';
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() { FakeSpeechRecognition.latest = this; }
  start() { /* results are delivered explicitly by the test */ }
  stop() { this.onend?.(); }
  result(transcript: string) { this.onresult?.({ results: [[{ transcript }]] }); }
}

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

function VoiceHarness({ onAddTransaction }: { onAddTransaction: () => boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Buka suara</button>
      {open && <VoiceInput onAddTransaction={onAddTransaction} onClose={() => setOpen(false)} />}
    </>
  );
}

describe('VoiceInput dialog', () => {
  it('provides dialog/focus semantics, named microphone controls, and duplicate-safe save', async () => {
    const user = userEvent.setup();
    const onAddTransaction = vi.fn(() => true);
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeSpeechRecognition });
    const { container } = render(<VoiceHarness onAddTransaction={onAddTransaction} />);
    const trigger = screen.getByRole('button', { name: 'Buka suara' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Input Suara' });
    expect(dialog).toHaveAccessibleDescription();
    const microphone = screen.getByRole('button', { name: 'Mulai perekaman suara' });
    await waitFor(() => expect(microphone).toHaveFocus());
    expect(await axe(container)).toHaveNoViolations();

    await user.click(microphone);
    expect(screen.getByRole('button', { name: 'Hentikan perekaman suara' })).toHaveAttribute('aria-pressed', 'true');
    FakeSpeechRecognition.latest?.result('beli nasi 15 ribu');
    const save = await screen.findByRole('button', { name: 'Simpan transaksi' });
    expect(screen.getByRole('button', { name: /Ubah kategori/ })).toHaveAccessibleName();
    await user.dblClick(save);
    expect(onAddTransaction).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Menyimpan…' })).toBeDisabled();
  });

  it('dismisses safely with Escape and restores focus', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeSpeechRecognition });
    render(<VoiceHarness onAddTransaction={() => true} />);
    const trigger = screen.getByRole('button', { name: 'Buka suara' });
    await user.click(trigger);
    await screen.findByRole('dialog', { name: 'Input Suara' });
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
