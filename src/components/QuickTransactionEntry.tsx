import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { CalendarDays, Check, Mic, RotateCcw, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { NewTransaction, Transaction, TransactionType } from '@/domain/types';
import { calendarDateToLocalInstant, compareCalendarDates, formatLocalCalendarDate } from '@/domain/calendar-date';
import { parsePositiveFiniteAmount } from '@/domain/transaction-validation';
import { parseVoiceTransaction } from '@/domain/voice-parser';
import { cn } from '@/lib/utils';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';
import TransactionAmountField from '@/components/TransactionAmountField';

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
  const sheetRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const webRecognitionRef = useRef<WebRecognition | null>(null);
  const nativeListenerRef = useRef<PluginListenerHandle | null>(null);
  const mountedRef = useRef(true);
  const saveGuard = useRef(false);

  const latest = useMemo(() => {
    const unique = new Map<string, Transaction>();
    transactions
      .filter((transaction) => transaction.type === type && transaction.category === category && transaction.category !== 'Langganan')
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
      .forEach((transaction) => {
        const key = `${transaction.amount}\u0000${transaction.description.trim().toLocaleLowerCase('id-ID')}`;
        if (!unique.has(key)) unique.set(key, transaction);
      });
    return Array.from(unique.values()).slice(0, 10);
  }, [category, transactions, type]);

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
        const currentPermission = await SpeechRecognition.checkPermissions();
        const permission = currentPermission.speechRecognition === 'prompt'
          ? await SpeechRecognition.requestPermissions()
          : currentPermission;
        if (permission.speechRecognition !== 'granted') throw new Error('Microphone permission is off. Enable it in the device settings to use voice input.');
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
          ref={sheetRef}
          className="quick-entry-sheet transaction-sheet"
          aria-describedby="quick-entry-description"
          onInteractOutside={(event) => event.preventDefault()}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (mode === 'normal') amountRef.current?.focus();
            else sheetRef.current?.focus();
          }}
        >
          <header className="quick-entry-header transaction-sheet-header">
            <div>
              <DialogPrimitive.Title>{category}</DialogPrimitive.Title>
              <DialogPrimitive.Description id="quick-entry-description">{type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</DialogPrimitive.Description>
            </div>
            <div className="dialog-header-actions">
              <label className="dialog-header-date" title="Pilih tanggal">
                <CalendarDays aria-hidden="true" />
                <input aria-label="Tanggal transaksi" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} required />
              </label>
              <DialogPrimitive.Close type="button" aria-label="Tutup formulir transaksi" disabled={submitting}><X aria-hidden="true" /></DialogPrimitive.Close>
            </div>
          </header>

          <form onSubmit={save} className="transaction-sheet-form quick-entry-form">
            {voiceMessage && (
              <div className="voice-inline-status" role="status">
                <Mic aria-hidden="true" className={cn('h-4 w-4', listening && 'animate-pulse')} />
                <span>{voiceMessage}</span>
                {!listening && <button type="button" onClick={() => void startRecognition()}>Coba lagi</button>}
              </div>
            )}

            <TransactionAmountField
              id="quick-amount"
              label={`Jumlah ${type === 'expense' ? 'pengeluaran' : 'pemasukan'}`}
              value={amount}
              onValueChange={setAmount}
              inputRef={amountRef}
              onEnter={() => descriptionRef.current?.focus()}
              action={(
                <button
                  type="submit"
                  className="transaction-amount-save"
                  aria-label={submitting ? 'Menyimpan transaksi dari nominal' : 'Simpan transaksi dari nominal'}
                  title="Simpan transaksi"
                  disabled={!valid || submitting}
                  onPointerDown={(event) => event.preventDefault()}
                >
                  <Check aria-hidden="true" />
                </button>
              )}
              required
            />

            <div className="transaction-detail-fields">
              <div className="transaction-line-field">
                <label htmlFor="quick-description">Deskripsi</label>
                <textarea ref={descriptionRef} id="quick-description" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Contoh: Makan siang" required />
              </div>
            </div>

            <section className="latest-section" aria-labelledby="latest-title">
              <div className="latest-heading">
                <h3 id="latest-title">Gunakan transaksi sebelumnya</h3>
              </div>
              {latest.length === 0 ? (
                <p className="latest-empty">Belum ada transaksi sebelumnya</p>
              ) : (
                <div className="latest-list">
                  {latest.map((transaction) => (
                    <LatestItem
                      key={transaction.id}
                      transaction={transaction}
                      onReuse={() => {
                        setAmount(String(transaction.amount));
                        setDescription(transaction.description);
                      }}
                    />
                  ))}
                </div>
              )}
            </section>

            <button type="submit" className="transaction-primary-action quick-save" disabled={!valid || submitting}>{submitting ? 'Menyimpan…' : 'Simpan transaksi'}</button>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

interface LatestItemProps {
  transaction: Transaction;
  onReuse: () => void;
}

const latestDateFormatter = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });

const LatestItem: React.FC<LatestItemProps> = ({ transaction, onReuse }) => (
  <button
    type="button"
    className="latest-item"
    aria-label={`Gunakan lagi ${transaction.description}, Rp${transaction.amount.toLocaleString('id-ID')}`}
    onClick={onReuse}
  >
    <span className="latest-item-icon"><RotateCcw aria-hidden="true" /></span>
    <span className="latest-item-copy">
      <strong>{transaction.description}</strong>
      <small>{latestDateFormatter.format(new Date(transaction.date))}</small>
    </span>
    <strong className="latest-item-amount">Rp{transaction.amount.toLocaleString('id-ID')}</strong>
  </button>
);

export default QuickTransactionEntry;
