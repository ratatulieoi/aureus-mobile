import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Mic, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { NewTransaction, Transaction, TransactionType } from '@/domain/types';
import { calendarDateToLocalInstant, compareCalendarDates, formatLocalCalendarDate } from '@/domain/calendar-date';
import { parsePositiveFiniteAmount } from '@/domain/transaction-validation';
import { parseVoiceTransaction } from '@/domain/voice-parser';
import { cn } from '@/lib/utils';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';

interface QuickTransactionEntryProps {
  type: TransactionType;
  category: string;
  mode: 'normal' | 'voice';
  transactions: Transaction[];
  onAddTransaction: (transaction: NewTransaction) => boolean;
  onClose: () => void;
}

type WebRecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type WebRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: WebRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type WebRecognitionCtor = new () => WebRecognition;

const QuickTransactionEntry: React.FC<QuickTransactionEntryProps> = ({
  type,
  category,
  mode,
  transactions,
  onAddTransaction,
  onClose,
}) => {
  const today = formatLocalCalendarDate(new Date());
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [listening, setListening] = useState(mode === 'voice');
  const [voiceMessage, setVoiceMessage] = useState(mode === 'voice' ? 'Menyiapkan mikrofon…' : '');
  const [submitting, setSubmitting] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const webRecognitionRef = useRef<WebRecognition | null>(null);
  const nativeListenerRef = useRef<PluginListenerHandle | null>(null);
  const mountedRef = useRef(true);
  const saveGuard = useRef(false);

  const latest = useMemo(() => transactions
    .filter((transaction) => transaction.type === type && transaction.category === category)
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 5), [category, transactions, type]);

  const parsedAmount = parsePositiveFiniteAmount(amount);
  const dateValid = date.length > 0 && (() => {
    try { return compareCalendarDates(date, today) <= 0; } catch { return false; }
  })();
  const valid = parsedAmount !== null && description.trim().length > 0 && dateValid;
  useMobileBackDismiss(!submitting, onClose);

  const applyTranscript = useCallback((transcript: string) => {
    const clean = transcript.trim();
    if (!clean) {
      setVoiceMessage('Tidak ada suara terdeteksi. Isi formulir secara manual atau coba lagi.');
      return;
    }
    try {
      const parsed = parseVoiceTransaction(clean);
      setAmount(String(parsed.amount));
      setDescription(parsed.description);
      setVoiceMessage('Hasil suara sudah diisi. Periksa sebelum menyimpan.');
    } catch {
      setDescription((current) => current || clean);
      setVoiceMessage('Sebagian ucapan belum dikenali. Lengkapi kolom yang masih kosong.');
    }
  }, []);

  const stopRecognition = useCallback(() => {
    try { webRecognitionRef.current?.stop(); } catch { /* recognizer may already be idle */ }
    if (Capacitor.isNativePlatform()) void SpeechRecognition.stop().catch(() => undefined);
  }, []);

  const startRecognition = useCallback(async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const available = await SpeechRecognition.available();
        if (!available.available) throw new Error('Pengenalan suara tidak tersedia.');
        const permission = await SpeechRecognition.requestPermissions();
        if (permission.speechRecognition !== 'granted') throw new Error('Izin mikrofon ditolak.');
        if (!mountedRef.current) return;
        setListening(true);
        setVoiceMessage('Mendengarkan…');
        const { matches } = await SpeechRecognition.start({ language: 'id-ID', maxResults: 1, partialResults: false, popup: false });
        if (!mountedRef.current) return;
        setListening(false);
        applyTranscript(matches?.[0] ?? '');
      } catch (error) {
        if (!mountedRef.current) return;
        setListening(false);
        setVoiceMessage(error instanceof Error ? error.message : 'Pengenalan suara gagal.');
      }
      return;
    }

    const speechWindow = window as unknown as { SpeechRecognition?: WebRecognitionCtor; webkitSpeechRecognition?: WebRecognitionCtor };
    const Recognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setListening(false);
      setVoiceMessage('Pengenalan suara tidak tersedia. Isi formulir secara manual.');
      return;
    }
    const recognition = new Recognition();
    webRecognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'id-ID';
    recognition.onresult = (event) => {
      setListening(false);
      applyTranscript(event.results?.[0]?.[0]?.transcript ?? '');
    };
    recognition.onerror = ({ error }) => {
      setListening(false);
      setVoiceMessage(error === 'no-speech' ? 'Tidak ada suara terdeteksi. Isi manual atau coba lagi.' : 'Pengenalan suara gagal. Isi formulir secara manual.');
    };
    recognition.onend = () => setListening(false);
    try {
      recognition.start();
      setListening(true);
      setVoiceMessage('Mendengarkan…');
    } catch {
      setListening(false);
      setVoiceMessage('Pengenalan suara belum dapat dimulai.');
    }
  }, [applyTranscript]);

  useEffect(() => {
    mountedRef.current = true;
    if (Capacitor.isNativePlatform()) {
      void SpeechRecognition.addListener('listeningState', ({ status }) => {
        if (mountedRef.current && status === 'stopped') setListening(false);
      }).then((handle) => {
        if (mountedRef.current) nativeListenerRef.current = handle;
        else void handle.remove();
      }).catch(() => undefined);
    }
    if (mode === 'voice') void startRecognition();
    return () => {
      mountedRef.current = false;
      stopRecognition();
      const listener = nativeListenerRef.current;
      if (listener) void listener.remove().catch(() => undefined);
    };
  }, [mode, startRecognition, stopRecognition]);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || parsedAmount === null || saveGuard.current) return;
    const instant = calendarDateToLocalInstant(date, new Date());
    if (!instant) return;
    saveGuard.current = true;
    setSubmitting(true);
    const succeeded = onAddTransaction({ type, category, amount: parsedAmount, description: description.trim(), date: instant });
    if (!succeeded) {
      saveGuard.current = false;
      setSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="quick-entry-overlay" />
        <DialogPrimitive.Content
          className="quick-entry-sheet"
          aria-describedby="quick-entry-description"
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => { event.preventDefault(); closeButtonRef.current?.focus(); }}
        >
          <header className="quick-entry-header">
            <div>
              <DialogPrimitive.Title>{category}</DialogPrimitive.Title>
              <DialogPrimitive.Description id="quick-entry-description">{type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close ref={closeButtonRef} type="button" aria-label="Tutup formulir transaksi" disabled={submitting}><X aria-hidden="true" /></DialogPrimitive.Close>
          </header>

          <form onSubmit={save} className="quick-entry-form">
            {voiceMessage && (
              <div className="voice-inline-status" role="status">
                <Mic aria-hidden="true" className={cn('h-4 w-4', listening && 'animate-pulse')} />
                <span>{voiceMessage}</span>
                {!listening && <button type="button" onClick={() => void startRecognition()}>Coba lagi</button>}
              </div>
            )}

            <label htmlFor="quick-amount">Jumlah {type === 'expense' ? 'pengeluaran' : 'pemasukan'}</label>
            <div className="rupiah-input">
              <span>Rp</span>
              <input
                id="quick-amount"
                inputMode="numeric"
                pattern="[0-9.]*"
                value={amount ? Number(amount).toLocaleString('id-ID') : ''}
                onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))}
                placeholder="0"
                required
              />
            </div>

            <label htmlFor="quick-description">Deskripsi</label>
            <textarea id="quick-description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} rows={2} required />

            <label htmlFor="quick-date">Tanggal</label>
            <input id="quick-date" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} required />

            <section className="latest-section" aria-labelledby="latest-title">
              <h3 id="latest-title">Latest</h3>
              {latest.length === 0 ? (
                <p className="latest-empty">Belum ada transaksi sebelumnya</p>
              ) : (
                <div className="latest-carousel">
                  {latest.map((transaction) => (
                    <LatestItem key={transaction.id} transaction={transaction} onAmount={() => setAmount(String(transaction.amount))} onDescription={() => setDescription(transaction.description)} onBoth={() => { setAmount(String(transaction.amount)); setDescription(transaction.description); }} />
                  ))}
                </div>
              )}
            </section>

            <button type="submit" className="quick-save" disabled={!valid || submitting}>{submitting ? 'Menyimpan…' : 'Simpan'}</button>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

interface LatestItemProps {
  transaction: Transaction;
  onAmount: () => void;
  onDescription: () => void;
  onBoth: () => void;
}

const LatestItem: React.FC<LatestItemProps> = ({ transaction, onAmount, onDescription, onBoth }) => {
  const timer = useRef<number | null>(null);
  const held = useRef(false);
  const moved = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const startHold = (event: React.PointerEvent<HTMLButtonElement>) => {
    held.current = false;
    moved.current = false;
    origin.current = { x: event.clientX, y: event.clientY };
    timer.current = window.setTimeout(() => { held.current = true; onBoth(); }, 550);
  };
  const move = (event: React.PointerEvent<HTMLButtonElement>) => {
    const start = origin.current;
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10) return;
    moved.current = true;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const finish = (action: () => void) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    origin.current = null;
    if (!held.current && !moved.current) action();
  };
  return (
    <article className="latest-item">
      <button type="button" onPointerDown={startHold} onPointerMove={move} onPointerUp={() => finish(onAmount)} onPointerCancel={() => finish(() => undefined)}>Rp{transaction.amount.toLocaleString('id-ID')}</button>
      <button type="button" onPointerDown={startHold} onPointerMove={move} onPointerUp={() => finish(onDescription)} onPointerCancel={() => finish(() => undefined)}>{transaction.description}</button>
    </article>
  );
};

export default QuickTransactionEntry;
