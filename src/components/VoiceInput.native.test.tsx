import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import VoiceInput from './VoiceInput';

type ListeningEvent = { status: 'started' | 'stopped' };
let listeningListener: ((event: ListeningEvent) => void) | null = null;
let nativeListening = false;
let startPromise: Promise<{ matches?: string[] }>;
let resolveStart: ((value: { matches?: string[] }) => void) | null = null;
let stopPromise: Promise<void>;

const speechMock = vi.hoisted(() => ({
  available: vi.fn(),
  requestPermissions: vi.fn(),
  isListening: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  addListener: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor-community/speech-recognition', () => ({ SpeechRecognition: speechMock }));

function deferredStart() {
  startPromise = new Promise((resolve) => { resolveStart = resolve; });
}

beforeEach(() => {
  listeningListener = null;
  nativeListening = false;
  deferredStart();
  stopPromise = new Promise<void>(() => undefined);
  speechMock.available.mockResolvedValue({ available: true });
  speechMock.requestPermissions.mockResolvedValue({ speechRecognition: 'granted' });
  speechMock.isListening.mockImplementation(async () => ({ listening: nativeListening }));
  speechMock.start.mockImplementation(() => startPromise);
  speechMock.stop.mockImplementation(() => stopPromise);
  speechMock.addListener.mockImplementation(async (_event: string, listener: (event: ListeningEvent) => void) => {
    listeningListener = listener;
    return { remove: vi.fn().mockResolvedValue(undefined) };
  });
});

describe('VoiceInput native cancellation lifecycle', () => {
  it('does not await an unresolved stop and releases only on listeningState stopped', async () => {
    const user = userEvent.setup();
    render(<VoiceInput onAddTransaction={() => true} onClose={() => undefined} />);
    await user.click(screen.getByRole('button', { name: 'Mulai perekaman suara' }));
    await screen.findByRole('button', { name: 'Hentikan perekaman suara' });

    await user.click(screen.getByRole('button', { name: 'Hentikan perekaman suara' }));
    expect(speechMock.stop).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Periksa status mikrofon' })).toBeEnabled();
    expect(screen.getByText('Mikrofon sedang berhenti. Tekan untuk memeriksa status.')).toBeInTheDocument();

    listeningListener?.({ status: 'stopped' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mulai perekaman suara' })).toBeEnabled());
  });

  it('ignores a late start result after cancellation', async () => {
    const user = userEvent.setup();
    render(<VoiceInput onAddTransaction={() => true} onClose={() => undefined} />);
    await user.click(screen.getByRole('button', { name: 'Mulai perekaman suara' }));
    await user.click(await screen.findByRole('button', { name: 'Hentikan perekaman suara' }));
    resolveStart?.({ matches: ['beli nasi 15 ribu'] });
    await Promise.resolve();

    expect(screen.queryByText('“beli nasi 15 ribu”')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Simpan transaksi' })).not.toBeInTheDocument();
  });

  it('prevents retry while release is pending and permits one retry after stopped', async () => {
    const user = userEvent.setup();
    render(<VoiceInput onAddTransaction={() => true} onClose={() => undefined} />);
    await user.click(screen.getByRole('button', { name: 'Mulai perekaman suara' }));
    await user.click(await screen.findByRole('button', { name: 'Hentikan perekaman suara' }));

    const pendingButton = screen.getByRole('button', { name: 'Periksa status mikrofon' });
    nativeListening = true;
    await user.click(pendingButton);
    expect(speechMock.start).toHaveBeenCalledOnce();
    expect(screen.getByText(/masih aktif/)).toBeInTheDocument();

    nativeListening = false;
    listeningListener?.({ status: 'stopped' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mulai perekaman suara' })).toBeEnabled());
    deferredStart();
    await user.click(screen.getByRole('button', { name: 'Mulai perekaman suara' }));
    expect(speechMock.start).toHaveBeenCalledTimes(2);
  });

  it('rejects retry when the plugin still reports listening', async () => {
    const user = userEvent.setup();
    nativeListening = true;
    render(<VoiceInput onAddTransaction={() => true} onClose={() => undefined} />);
    await user.click(screen.getByRole('button', { name: 'Mulai perekaman suara' }));

    expect(speechMock.start).not.toHaveBeenCalled();
    expect(await screen.findByText(/Mikrofon masih berhenti/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Periksa status mikrofon' })).toBeEnabled();
  });
});
