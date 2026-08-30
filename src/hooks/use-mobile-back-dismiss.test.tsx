import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useMobileBackDismiss } from './use-mobile-back-dismiss';

const originalState = window.history.state;

const Harness = ({ nested = false }: { nested?: boolean }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  useMobileBackDismiss(formOpen, () => setFormOpen(false));
  useMobileBackDismiss(nested && pickerOpen, () => setPickerOpen(false));

  return (
    <>
      <button type="button" onClick={() => setFormOpen(true)}>Buka form</button>
      {formOpen && <div>Form terbuka</div>}
      {formOpen && nested && <button type="button" onClick={() => setPickerOpen(true)}>Buka pemilih</button>}
      {pickerOpen && <div>Pemilih terbuka</div>}
    </>
  );
};

afterEach(() => {
  window.history.replaceState(originalState, '', window.location.href);
  vi.restoreAllMocks();
});

describe('useMobileBackDismiss', () => {
  it('closes an open form when the phone back action pops its history entry', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Buka form' }));

    expect(screen.getByText('Form terbuka')).toBeInTheDocument();
    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: originalState })));
    expect(screen.queryByText('Form terbuka')).not.toBeInTheDocument();
  });

  it('closes only the topmost layer for each phone back action', async () => {
    const user = userEvent.setup();
    render(<Harness nested />);
    await user.click(screen.getByRole('button', { name: 'Buka form' }));
    await user.click(screen.getByRole('button', { name: 'Buka pemilih' }));

    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: originalState })));
    expect(screen.queryByText('Pemilih terbuka')).not.toBeInTheDocument();
    expect(screen.getByText('Form terbuka')).toBeInTheDocument();

    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 0)); });
    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: originalState })));
    expect(screen.queryByText('Form terbuka')).not.toBeInTheDocument();
  });
});
