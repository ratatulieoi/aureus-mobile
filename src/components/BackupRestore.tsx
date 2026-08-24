import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { CategoryCatalog, Subscription, Transaction } from '@/domain/types';
import { createBackupEnvelope, MAX_BACKUP_BYTES, parseBackupText, type DecodedBackup } from '@/domain/backup';
import { formatLocalCalendarDate } from '@/domain/calendar-date';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { writeNativeExportFile } from '@/platform/export-file';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BackupRestoreProps {
  transactions: Transaction[];
  subscriptions: Subscription[];
  categories?: CategoryCatalog;
  onRestore: (snapshot: { transactions: Transaction[]; subscriptions: Subscription[]; categories: CategoryCatalog }) => void;
}

const BackupRestore: React.FC<BackupRestoreProps> = ({ transactions, subscriptions, categories, onRestore }) => {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<DecodedBackup | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);

  const resetInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleBackup = async () => {
    setIsProcessing(true);
    setMessage(null);
    try {
      const envelope = categories
        ? createBackupEnvelope(transactions, subscriptions, categories)
        : createBackupEnvelope(transactions, subscriptions);
      const jsonString = JSON.stringify(envelope, null, 2);
      const fileName = `aureus-backup-${formatLocalCalendarDate(new Date())}.json`;
      if (Capacitor.isNativePlatform()) {
        const result = await writeNativeExportFile(fileName, jsonString);
        await Share.share({ title: 'Backup Aureus', text: 'Backup data Aureus', url: result.uri, dialogTitle: 'Simpan atau Bagikan Backup' });
      } else {
        const url = URL.createObjectURL(new Blob([jsonString], { type: 'application/json' }));
        try {
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          link.remove();
        } finally {
          URL.revokeObjectURL(url);
        }
      }
      setMessage({ type: 'success', text: `Backup berhasil dibuat: ${fileName}` });
    } catch (error) {
      console.error('Backup error:', error);
      setMessage({ type: 'error', text: 'Gagal membuat backup. Silakan coba lagi.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      setMessage({ type: 'error', text: `File backup terlalu besar (maksimum ${MAX_BACKUP_BYTES / 1024 / 1024} MB).` });
      resetInput();
      return;
    }

    setIsProcessing(true);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (typeof reader.result !== 'string') throw new Error('Isi file backup tidak dapat dibaca');
        setPendingRestore(parseBackupText(reader.result));
      } catch (error) {
        console.error('Restore validation error:', error);
        setMessage({ type: 'error', text: error instanceof Error ? error.message : 'File backup tidak valid.' });
      } finally {
        setIsProcessing(false);
        resetInput();
      }
    };
    reader.onerror = () => {
      setMessage({ type: 'error', text: 'Gagal membaca file backup.' });
      setIsProcessing(false);
      resetInput();
    };
    reader.onabort = () => {
      setIsProcessing(false);
      resetInput();
    };
    reader.readAsText(file);
  };

  const cancelRestore = () => {
    setPendingRestore(null);
    setIsProcessing(false);
    resetInput();
  };

  const confirmRestore = () => {
    if (!pendingRestore) return;
    const count = pendingRestore.transactions.length;
    onRestore({ transactions: pendingRestore.transactions, subscriptions: pendingRestore.subscriptions, categories: pendingRestore.categories });
    setPendingRestore(null);
    setMessage({ type: 'success', text: `Berhasil memulihkan ${count} transaksi dan ${pendingRestore.subscriptions.length} langganan.` });
    setIsProcessing(false);
    resetInput();
  };

  return (
    <>
      <Card className="aureus-form-card p-5">
        <div className="space-y-6">
          <div><h2 className="mb-1 text-xl font-bold text-foreground">Backup & Restore</h2><p className="text-sm leading-relaxed text-muted-foreground">Simpan atau pulihkan transaksi dan langganan dalam format JSON tervalidasi.</p></div>
          {message && <Alert role={message.type === 'error' ? 'alert' : 'status'} aria-live={message.type === 'error' ? 'assertive' : 'polite'} variant={message.type === 'error' ? 'destructive' : 'default'}>{message.type === 'success' ? <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-success" /> : <AlertCircle aria-hidden="true" className="h-4 w-4" />}<AlertDescription>{message.text}</AlertDescription></Alert>}
          <div className="form-option-grid">
            <section className="form-option"><div className="form-option-heading"><Download aria-hidden="true" /><div><h3>Backup Data</h3><p>Ekspor seluruh data ke satu file.</p></div></div><Button onClick={handleBackup} disabled={isProcessing} aria-busy={isProcessing} className="w-full whitespace-normal"><FileJson aria-hidden="true" />{isProcessing ? 'Memproses...' : `Backup (${transactions.length} transaksi)`}</Button></section>
            <section className="form-option"><div className="form-option-heading"><Upload aria-hidden="true" /><div><h3>Restore Data</h3><p id="restore-file-help">Validasi dahulu, lalu konfirmasi penggantian.</p></div></div><Button ref={restoreButtonRef} onClick={() => fileInputRef.current?.click()} disabled={isProcessing} aria-busy={isProcessing} variant="outline" className="w-full whitespace-normal"><Upload aria-hidden="true" />{isProcessing ? 'Memproses...' : 'Pilih File Backup'}</Button><input ref={fileInputRef} id="restore-file-input" type="file" accept=".json,application/json" aria-describedby="restore-file-help" aria-label="Pilih file backup JSON" onChange={handleRestore} className="sr-only" tabIndex={-1} /></section>
          </div>
          <Alert role="note"><AlertCircle aria-hidden="true" className="h-4 w-4" /><AlertDescription className="text-xs"><strong>Perhatian:</strong> Restore yang dikonfirmasi mengganti seluruh transaksi dan langganan saat ini. File tidak valid tidak akan mengubah data.</AlertDescription></Alert>
        </div>
      </Card>

      <AlertDialog open={pendingRestore !== null} onOpenChange={(open) => { if (!open) cancelRestore(); }}>
        <AlertDialogContent onCloseAutoFocus={(event) => { event.preventDefault(); window.requestAnimationFrame(() => restoreButtonRef.current?.focus()); }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Ganti semua data Aureus?</AlertDialogTitle>
            <AlertDialogDescription>
              Data saat ini ({transactions.length} transaksi, {subscriptions.length} langganan) akan diganti dengan backup ({pendingRestore?.transactions.length ?? 0} transaksi, {pendingRestore?.subscriptions.length ?? 0} langganan).
              {pendingRestore?.warning ? ` ${pendingRestore.warning}` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel onClick={cancelRestore}>Batal</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmRestore}>Ya, ganti semua data</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BackupRestore;
