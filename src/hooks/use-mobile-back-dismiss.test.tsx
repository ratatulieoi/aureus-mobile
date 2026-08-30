import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAndroidBackButton, useMobileBackDismiss } from './use-mobile-back-dismiss';

const nativeMock = vi.hoisted(() => ({
  native: false,
  platform: 'web',
  addListener: vi.fn(),
  exitApp: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => nativeMock.native,
    getPlatform: () => nativeMock.platform,
  },
}));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: (...args: unknown[]) => nativeMock.addListener(...args),
    exitApp: (...args: unknown[]) => nativeMock.exitApp(...args),
  },
}));

const originalState = window.history.state;

const Harness = ({ nested = false }: { nested?: boolean }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  useAndroidBackButton();
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

beforeEach(() => {
  nativeMock.native = false;
  nativeMock.platform = 'web';
  nativeMock.addListener.mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) });
  nativeMock.exitApp.mockResolvedValue(undefined);
});

afterEach(() => {
  window.history.replaceState(originalState, '', window.location.href);
});

describe('useMobileBackDismiss', () => {
  it('closes an open form when browser history is popped', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Buka form' }));

    expect(screen.getByText('Form terbuka')).toBeInTheDocument();
    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: originalState })));
    expect(screen.queryByText('Form terbuka')).not.toBeInTheDocument();
  });

  it('closes only the topmost browser layer for each history action', async () => {
    const user = userEvent.setup();
    render(<Harness nested />);
    await openNestedLayers(user);

    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: originalState })));
    expectOnlyFormOpen();

    await act(async () => { await new Promise((resolve) => window.setTimeout(resolve, 0)); });
    act(() => window.dispatchEvent(new PopStateEvent('popstate', { state: originalState })));
    expectAllLayersClosed();
  });

  it('uses the native Android Back event to close nested layers before exiting', async () => {
    nativeMock.native = true;
    nativeMock.platform = 'android';
    const user = userEvent.setup();
    render(<Harness nested />);
    const back = await nativeBackListener();
    await openNestedLayers(user);

    act(() => back());
    expectOnlyFormOpen();
    expect(nativeMock.exitApp).not.toHaveBeenCalled();

    act(() => back());
    expectAllLayersClosed();
    expect(nativeMock.exitApp).not.toHaveBeenCalled();

    act(() => back());
    expect(nativeMock.exitApp).toHaveBeenCalledOnce();
  });
});

async function nativeBackListener(): Promise<() => void> {
  await vi.waitFor(() => expect(nativeMock.addListener).toHaveBeenCalledWith('backButton', expect.any(Function)));
  return nativeMock.addListener.mock.calls[0][1] as () => void;
}

async function openNestedLayers(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(screen.getByRole('button', { name: 'Buka form' }));
  await user.click(screen.getByRole('button', { name: 'Buka pemilih' }));
}

function expectOnlyFormOpen(): void {
  expect(screen.queryByText('Pemilih terbuka')).not.toBeInTheDocument();
  expect(screen.getByText('Form terbuka')).toBeInTheDocument();
}

function expectAllLayersClosed(): void {
  expect(screen.queryByText('Pemilih terbuka')).not.toBeInTheDocument();
  expect(screen.queryByText('Form terbuka')).not.toBeInTheDocument();
}
