import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, MicOff, Hash, Edit, CalendarDays } from 'lucide-react';
import type { NewTransaction } from '@/domain/types';
import { TRANSACTION_CATEGORIES } from '@/domain/categories';
import { parseVoiceTransaction, type ParsedVoiceTransaction } from '@/domain/voice-parser';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { attemptTransactionCommit } from '@/domain/transaction-action';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';

interface VoiceInputProps {
  onAddTransaction: (transaction: NewTransaction) => boolean;
  onClose: () => void;
}

type WebSpeechRecognitionEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type WebSpeechRecognitionErrorEvent = {
  error: string;
};

type WebSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

type VoiceOperation = 'idle' | 'starting' | 'listening' | 'stopping' | 'processing' | 'saving';

const VoiceInput: React.FC<VoiceInputProps> = ({ onAddTransaction, onClose }) => {
  const [operation, setOperation] = useState<VoiceOperation>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsedTransaction, setParsedTransaction] = useState<ParsedVoiceTransaction | null>(null);
  const [error, setError] = useState<string>('');
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [nativeReleasePending, setNativeReleasePending] = useState(false);
  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const nativeListenerRef = useRef<PluginListenerHandle | null>(null);
  const processVoiceInputRef = useRef<(text: string) => void>(() => {});
  const saveGuardRef = useRef(false);
  const transitionGuardRef = useRef(false);
  const nativeReleasePendingRef = useRef(false);
  const operationIdRef = useRef(0);
  const mountedRef = useRef(true);
  const microphoneButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  const isListening = operation === 'listening';
  const isProcessing = operation === 'processing';
  const isSaving = operation === 'saving';
  const dismissalBlocked = operation === 'starting' || isSaving;

  const markNativeStopped = useCallback(() => {
    nativeReleasePendingRef.current = false;
    transitionGuardRef.current = false;
    if (mountedRef.current) {
      setNativeReleasePending(false);
      setOperation((current) => current === 'saving' ? current : 'idle');
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (Capacitor.isNativePlatform()) {
      void SpeechRecognition.addListener('listeningState', ({ status }) => {
        if (status === 'stopped') markNativeStopped();
      }).then((handle) => {
        if (!mountedRef.current) void handle.remove();
        else nativeListenerRef.current = handle;
      }).catch((listenerError: unknown) => {
        console.error('Gagal memasang listener status mikrofon', listenerError);
      });
    } else {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        setError('Browser tidak mendukung speech recognition. Gunakan Chrome atau Edge.');
        return () => { mountedRef.current = false; };
      }

      const speechWindow = window as unknown as {
        SpeechRecognition?: WebSpeechRecognitionCtor;
        webkitSpeechRecognition?: WebSpeechRecognitionCtor;
      };
      const SpeechRecognitionWeb = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
      if (!SpeechRecognitionWeb) {
        setError('Browser tidak mendukung speech recognition. Gunakan Chrome atau Edge.');
        return () => { mountedRef.current = false; };
      }

      const recognition = new SpeechRecognitionWeb();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'id-ID';
      recognition.onresult = (event) => {
        const finalTranscript = event.results?.[0]?.[0]?.transcript ?? '';
        setTranscript(finalTranscript);
        processVoiceInputRef.current(finalTranscript);
      };
      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setError(event.error === 'no-speech'
          ? 'Tidak ada suara terdeteksi. Silakan coba lagi.'
          : event.error === 'network'
            ? 'Masalah koneksi jaringan. Periksa internet Anda.'
            : `Terjadi kesalahan pengenalan suara: ${event.error}`);
        setOperation('idle');
      };
      recognition.onend = () => {
        transitionGuardRef.current = false;
        setOperation((current) => current === 'processing' || current === 'saving' ? current : 'idle');
      };
    }

    return () => {
      mountedRef.current = false;
      operationIdRef.current += 1;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try { recognition.stop(); } catch { /* recognizer may already be idle */ }
      }
      const nativeListener = nativeListenerRef.current;
      nativeListenerRef.current = null;
      if (nativeListener) void nativeListener.remove().catch(() => undefined);
      if (Capacitor.isNativePlatform()) void SpeechRecognition.stop().catch(() => undefined);
    };
  }, [markNativeStopped]);

  const processVoiceInput = (text: string) => {
    setOperation('processing');
    try {
      setParsedTransaction(parseVoiceTransaction(text));
      setError('');
    } catch (parseError) {
      console.error(parseError);
      setError('Tidak dapat memahami input. Coba lagi dengan format: “beli nasi 15 ribu” atau “dapat gaji 5 juta”.');
    } finally {
      setOperation('idle');
    }
  };
  processVoiceInputRef.current = processVoiceInput;

  const startListening = async () => {
    if (transitionGuardRef.current || nativeReleasePendingRef.current || operation !== 'idle') return;
    transitionGuardRef.current = true;
    const operationId = ++operationIdRef.current;
    setTranscript('');
    setParsedTransaction(null);
    setError('');
    setIsEditingCategory(false);
    setOperation('starting');

    if (Capacitor.isNativePlatform()) {
      try {
        const nativeState = await SpeechRecognition.isListening();
        if (nativeState.listening || nativeReleasePendingRef.current) {
          nativeReleasePendingRef.current = true;
          setNativeReleasePending(true);
          setError('Mikrofon masih berhenti dari sesi sebelumnya. Tunggu status berhenti sebelum mencoba lagi.');
          setOperation('idle');
          transitionGuardRef.current = false;
          return;
        }
        const available = await SpeechRecognition.available();
        if (!available.available) throw new Error('Layanan pengenalan suara tidak tersedia di perangkat ini.');
        const currentPermission = await SpeechRecognition.checkPermissions();
        const permission = currentPermission.speechRecognition === 'prompt'
          ? await SpeechRecognition.requestPermissions()
          : currentPermission;
        if (permission.speechRecognition !== 'granted') {
          throw new Error('Izin mikrofon ditolak. Aktifkan izin mikrofon di pengaturan perangkat.');
        }
        if (!mountedRef.current || operationId !== operationIdRef.current) {
          transitionGuardRef.current = false;
          return;
        }
        setOperation('listening');
        transitionGuardRef.current = false;
        const { matches } = await SpeechRecognition.start({
          language: 'id-ID',
          maxResults: 1,
          partialResults: false,
          popup: false,
        });
        if (!mountedRef.current || operationId !== operationIdRef.current) return;
        const text = matches?.[0];
        if (text) {
          setTranscript(text);
          processVoiceInputRef.current(text);
        } else {
          setOperation('idle');
          transitionGuardRef.current = false;
        }
      } catch (caughtError: unknown) {
        console.error(caughtError);
        if (!mountedRef.current || operationId !== operationIdRef.current) {
          transitionGuardRef.current = false;
          return;
        }
        const message = caughtError instanceof Error ? caughtError.message : 'Terjadi kesalahan yang tidak dikenal.';
        setError(`Gagal memulai input suara: ${message}`);
        setOperation('idle');
        transitionGuardRef.current = false;
      }
    } else {
      try {
        recognitionRef.current?.start();
        setOperation('listening');
        transitionGuardRef.current = false;
      } catch (caughtError) {
        console.error('Failed to start recognition:', caughtError);
        setError('Pengenalan suara belum dapat dimulai. Tunggu sebentar lalu coba lagi.');
        setOperation('idle');
        transitionGuardRef.current = false;
      }
    }
  };

  const checkNativeRelease = async () => {
    if (transitionGuardRef.current || !nativeReleasePendingRef.current) return;
    transitionGuardRef.current = true;
    try {
      const state = await SpeechRecognition.isListening();
      if (state.listening) {
        setError('Mikrofon perangkat masih aktif. Tunggu status berhenti lalu periksa lagi.');
      } else {
        markNativeStopped();
        setError('');
      }
    } catch (caughtError) {
      console.error('Failed to check recognition state:', caughtError);
      setError('Status mikrofon belum dapat diperiksa. Silakan periksa lagi.');
    } finally {
      transitionGuardRef.current = false;
    }
  };

  const stopListening = () => {
    if (transitionGuardRef.current || !isListening) return;
    ++operationIdRef.current; // invalidate the pending start result immediately
    if (Capacitor.isNativePlatform()) {
      nativeReleasePendingRef.current = true;
      setNativeReleasePending(true);
      setOperation('idle');
      // Fire-and-observe: the plugin's listeningState event owns release. The
      // UI never awaits the known non-settling Android stop promise.
      void SpeechRecognition.stop().catch((caughtError: unknown) => {
        console.error('Failed to stop recognition:', caughtError);
        if (mountedRef.current) setError('Perintah berhenti gagal. Tunggu status mikrofon perangkat sebelum mencoba lagi.');
      });
      return;
    }

    transitionGuardRef.current = true;
    setOperation('stopping');
    try {
      recognitionRef.current?.stop();
    } catch (caughtError) {
      console.error('Failed to stop recognition:', caughtError);
      setError('Perekaman belum dapat dihentikan. Silakan coba lagi.');
      transitionGuardRef.current = false;
      setOperation('idle');
    }
  };

  const requestClose = () => {
    if (dismissalBlocked) return;
    if (Capacitor.isNativePlatform() && (isListening || nativeReleasePendingRef.current)) {
      ++operationIdRef.current;
      nativeReleasePendingRef.current = true;
      void SpeechRecognition.stop().catch(() => undefined);
    }
    onClose();
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };
  useMobileBackDismiss(!dismissalBlocked, requestClose);

  const handleCategoryChange = (newCategory: string) => {
    if (!parsedTransaction) return;
    setParsedTransaction({ ...parsedTransaction, category: newCategory });
    setIsEditingCategory(false);
  };

  const handleSave = () => {
    if (saveGuardRef.current || !parsedTransaction || !Number.isSafeInteger(parsedTransaction.amount) || parsedTransaction.amount <= 0) return;
    setOperation('saving');
    const succeeded = attemptTransactionCommit(saveGuardRef, () => onAddTransaction({
      ...parsedTransaction,
      date: parsedTransaction.date.toISOString(),
    }));
    if (!succeeded) {
      setOperation('idle');
      setError('Transaksi belum tersimpan. Silakan coba lagi.');
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) requestClose(); }}>
      <DialogContent
        hideClose={dismissalBlocked}
        closeLabel="Tutup input suara"
        className="max-w-md"
        onEscapeKeyDown={(event) => { if (dismissalBlocked) event.preventDefault(); }}
        onInteractOutside={(event) => { if (dismissalBlocked) event.preventDefault(); }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          microphoneButtonRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash aria-hidden="true" className="h-5 w-5 text-primary" />
            Input Suara
          </DialogTitle>
          <DialogDescription>
            Tekan mikrofon, ucapkan transaksi dalam bahasa Indonesia, lalu periksa hasil sebelum menyimpan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4" aria-busy={operation !== 'idle'}>
          {error && (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Coba: “Beli nasi padang goceng kemarin”</p>
            <Button
              ref={microphoneButtonRef}
              type="button"
              onClick={nativeReleasePending ? checkNativeRelease : isListening ? stopListening : startListening}
              disabled={operation === 'starting' || operation === 'stopping' || isProcessing || isSaving || error.includes('Browser tidak mendukung')}
              aria-label={nativeReleasePending ? 'Periksa status mikrofon' : isListening ? 'Hentikan perekaman suara' : 'Mulai perekaman suara'}
              aria-pressed={isListening}
              className={`h-24 w-24 rounded-full transition-all duration-300 ${isListening ? 'animate-pulse bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
            >
              {isListening ? <MicOff aria-hidden="true" className="h-10 w-10" /> : <Mic aria-hidden="true" className="h-10 w-10" />}
            </Button>
            <p role="status" aria-live="polite" className="text-sm font-medium">
              {operation === 'starting' ? 'Menyiapkan mikrofon…' : operation === 'stopping' ? 'Menghentikan…' : nativeReleasePending ? 'Mikrofon sedang berhenti. Tekan untuk memeriksa status.' : isListening ? 'Mendengarkan…' : 'Tekan untuk berbicara'}
            </p>
          </div>

          {transcript && (
            <div className="rounded-xl border border-border/25 bg-[hsl(var(--home-surface-muted))] p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Input Suara</p>
              <p className="break-words text-sm italic">“{transcript}”</p>
            </div>
          )}

          {isProcessing && (
            <div role="status" className="py-4 text-center">
              <div aria-hidden="true" className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-muted border-b-primary" />
              <p className="text-sm text-muted-foreground">Memproses…</p>
            </div>
          )}

          {parsedTransaction && (
            <div className="space-y-3 rounded-2xl border border-success/25 bg-[hsl(var(--home-surface-muted))] p-4 shadow-sm">
              <div role="status" className="flex items-center gap-2">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-success" />
                <p className="text-sm font-semibold text-success">Analisis selesai</p>
              </div>

              <dl className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border/20 bg-[hsl(var(--home-surface))] p-3">
                  <dt className="text-muted-foreground">Jenis</dt>
                  <dd className={`rounded border px-2 py-0.5 text-xs font-bold ${parsedTransaction.type === 'income' ? 'border-success/40 bg-success/10 text-success' : 'border-destructive/40 bg-destructive/10 text-destructive'}`}>
                    {parsedTransaction.type === 'income' ? '↑ PEMASUKAN' : '↓ PENGELUARAN'}
                  </dd>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border/20 bg-[hsl(var(--home-surface))] p-3">
                  <dt className="text-muted-foreground">Tanggal</dt>
                  <dd className="flex items-center gap-2 text-right font-medium"><CalendarDays aria-hidden="true" className="h-4 w-4 text-muted-foreground" />{new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(parsedTransaction.date)}</dd>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border/20 bg-[hsl(var(--home-surface))] p-3">
                  <dt className="text-muted-foreground">Kategori</dt>
                  <dd className="flex min-w-0 items-center justify-end gap-2">
                    <span className="break-words text-right font-bold">{parsedTransaction.category}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditingCategory(true)} aria-label={`Ubah kategori ${parsedTransaction.category}`} className="h-11 w-11 shrink-0">
                      <Edit aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </dd>
                </div>
                {isEditingCategory && (
                  <div className="form-field">
                    <Label htmlFor="voice-category">Kategori hasil suara</Label>
                    <Select value={parsedTransaction.category} onValueChange={handleCategoryChange}>
                      <SelectTrigger id="voice-category"><SelectValue /></SelectTrigger>
                      <SelectContent>{TRANSACTION_CATEGORIES[parsedTransaction.type].map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="rounded-xl border border-border/20 bg-[hsl(var(--home-surface))] p-3">
                  <div className="flex min-w-0 items-baseline justify-between gap-3"><dt className="text-xs text-muted-foreground">Total</dt><dd className="break-words text-right text-lg font-bold">Rp {parsedTransaction.amount.toLocaleString('id-ID')}</dd></div>
                  <div className="mt-1 flex min-w-0 items-start justify-between gap-3"><dt className="text-xs text-muted-foreground">Keterangan</dt><dd className="min-w-0 break-words text-right text-sm font-medium">{parsedTransaction.description}</dd></div>
                </div>
              </dl>

              <DialogFooter>
                <Button type="button" variant="outline" disabled={isSaving} onClick={() => { setTranscript(''); setParsedTransaction(null); setIsEditingCategory(false); void startListening(); }}>Ulangi</Button>
                <Button type="button" onClick={handleSave} disabled={isSaving} aria-disabled={isSaving} className="bg-success text-success-foreground hover:bg-success/90">
                  {isSaving ? 'Menyimpan…' : 'Simpan transaksi'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceInput;
