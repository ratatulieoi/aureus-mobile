import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import QuickTransactionEntry from './QuickTransactionEntry';

const speechMock = vi.hoisted(() => ({
  available: vi.fn(),
  checkPermissions: vi.fn(),
  requestPermissions: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  addListener: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor-community/speech-recognition', () => ({ SpeechRecognition: speechMock }));

beforeEach(() => {
  vi.clearAllMocks();
  speechMock.available.mockResolvedValue({ available: true });
  speechMock.checkPermissions.mockResolvedValue({ speechRecognition: 'granted' });
  speechMock.requestPermissions.mockResolvedValue({ speechRecognition: 'granted' });
  speechMock.start.mockResolvedValue({ matches: ['beli nasi 15 ribu'] });
  speechMock.stop.mockResolvedValue(undefined);
  speechMock.addListener.mockResolvedValue({ remove: vi.fn().mockResolvedValue(undefined) });
});

describe('Quick transaction native voice entry', () => {
  it('does not request permission again when already granted and suppresses the Google popup', async () => {
    render(<QuickTransactionEntry type="expense" category="Makanan & Minuman" mode="voice" transactions={[]} onAddTransaction={() => true} onClose={vi.fn()} />);

    await waitFor(() => expect(speechMock.start).toHaveBeenCalledOnce());
    expect(speechMock.checkPermissions).toHaveBeenCalledOnce();
    expect(speechMock.requestPermissions).not.toHaveBeenCalled();
    expect(speechMock.start).toHaveBeenCalledWith(expect.objectContaining({ popup: false, partialResults: false }));
    expect(speechMock.start.mock.calls[0][0]).not.toHaveProperty('prompt');
    expect(await screen.findByLabelText('Jumlah pengeluaran')).toHaveValue('15.000');
    expect(screen.getByLabelText('Deskripsi')).toHaveValue('Nasi');
  });

  it('requests microphone permission once only while the permission is still promptable', async () => {
    speechMock.checkPermissions.mockResolvedValue({ speechRecognition: 'prompt' });
    render(<QuickTransactionEntry type="expense" category="Makanan & Minuman" mode="voice" transactions={[]} onAddTransaction={() => true} onClose={vi.fn()} />);
    await waitFor(() => expect(speechMock.start).toHaveBeenCalledOnce());
    expect(speechMock.requestPermissions).toHaveBeenCalledOnce();
  });

  it.each(['denied', 'prompt-with-rationale'])('does not reopen the permission dialog after %s', async (permissionState) => {
    speechMock.checkPermissions.mockResolvedValue({ speechRecognition: permissionState });
    render(<QuickTransactionEntry type="expense" category="Makanan & Minuman" mode="voice" transactions={[]} onAddTransaction={() => true} onClose={vi.fn()} />);
    expect(await screen.findByText(/Microphone permission is off/)).toBeInTheDocument();
    expect(speechMock.requestPermissions).not.toHaveBeenCalled();
    expect(speechMock.start).not.toHaveBeenCalled();
  });
});
