import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Download, Upload, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Transaction } from '@/pages/Index';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BackupRestoreProps {
  transactions: Transaction[];
  onRestore: (transactions: Transaction[]) => void;
}

const BackupRestore: React.FC<BackupRestoreProps> = ({ transactions, onRestore }) => {
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBackup = async () => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const backupData = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        transactionCount: transactions.length,
        transactions: transactions,
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const fileName = `aureus-backup-${new Date().toISOString().split('T')[0]}.json`;

      if (Capacitor.isNativePlatform()) {
        // Mobile: Use Filesystem + Share
        const result = await Filesystem.writeFile({
          path: fileName,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'Backup Aureus',
          text: 'Backup data transaksi Aureus',
          url: result.uri,
          dialogTitle: 'Simpan atau Bagikan Backup',
        });

        setMessage({ type: 'success', text: `Backup berhasil dibuat: ${fileName}` });
      } else {
        // Web: Trigger download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setMessage({ type: 'success', text: `Backup berhasil diunduh: ${fileName}` });
      }
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

    setIsProcessing(true);
    setMessage(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        // Validate backup structure
        if (!data.transactions || !Array.isArray(data.transactions)) {
          throw new Error('Format backup tidak valid');
        }

        // Validate and normalize each transaction
        const restoredTransactions: Transaction[] = [];
        for (const t of data.transactions) {
          if (
            typeof t === 'object' &&
            t !== null &&
            (t.type === 'income' || t.type === 'expense') &&
            typeof t.amount === 'number' &&
            typeof t.category === 'string' &&
            typeof t.description === 'string' &&
            typeof t.date === 'string'
          ) {
            restoredTransactions.push({
              id: typeof t.id === 'string' ? t.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              type: t.type,
              amount: t.amount,
              category: t.category,
              description: t.description,
              date: t.date,
            });
          }
        }

        if (restoredTransactions.length === 0) {
          throw new Error('Tidak ada transaksi valid dalam backup');
        }

        // Restore data
        onRestore(restoredTransactions);
        setMessage({
          type: 'success',
          text: `Berhasil restore ${restoredTransactions.length} transaksi dari backup`,
        });
      } catch (error) {
        console.error('Restore error:', error);
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Gagal restore backup. File mungkin rusak.',
        });
      } finally {
        setIsProcessing(false);
        // Reset input
        event.target.value = '';
      }
    };

    reader.onerror = () => {
      setMessage({ type: 'error', text: 'Gagal membaca file' });
      setIsProcessing(false);
    };

    reader.readAsText(file);
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground mb-2">Backup & Restore</h2>
          <p className="text-sm text-muted-foreground">
            Simpan atau pulihkan data transaksi Anda dalam format JSON
          </p>
        </div>

        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Backup Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Download className="h-5 w-5" />
              <h3 className="font-semibold">Backup Data</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Ekspor semua transaksi ke file JSON
            </p>
            <Button
              onClick={handleBackup}
              disabled={isProcessing || transactions.length === 0}
              className="w-full gap-2"
            >
              <FileJson className="h-4 w-4" />
              {isProcessing ? 'Memproses...' : `Backup (${transactions.length} transaksi)`}
            </Button>
          </div>

          {/* Restore Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Upload className="h-5 w-5" />
              <h3 className="font-semibold">Restore Data</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Pulihkan transaksi dari file backup
            </p>
            <Button
              onClick={() => document.getElementById('restore-file-input')?.click()}
              disabled={isProcessing}
              variant="outline"
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              {isProcessing ? 'Memproses...' : 'Pilih File Backup'}
            </Button>
            <input
              id="restore-file-input"
              type="file"
              accept=".json"
              onChange={handleRestore}
              className="hidden"
            />
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Perhatian:</strong> Restore akan mengganti semua data yang ada saat ini. Pastikan untuk backup data saat ini sebelum melakukan restore.
          </AlertDescription>
        </Alert>
      </div>
    </Card>
  );
};

export default BackupRestore;
