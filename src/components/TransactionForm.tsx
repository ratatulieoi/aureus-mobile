import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { Hash } from 'lucide-react';
import type { NewTransaction } from '@/domain/types';
import { TRANSACTION_CATEGORIES } from '@/domain/categories';
import { parsePositiveFiniteAmount } from '@/domain/transaction-validation';
import { calendarDateToLocalInstant, formatLocalCalendarDate } from '@/domain/calendar-date';
import { attemptTransactionCommit } from '@/domain/transaction-action';

interface TransactionFormProps {
  onAddTransaction: (transaction: NewTransaction) => boolean;
  onClose: () => void;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAddTransaction, onClose }) => {
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    category: '',
    description: '',
    date: formatLocalCalendarDate(new Date()),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitGuard = useRef(false);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );

  const requestClose = () => {
    if (submitGuard.current) return;
    onClose();
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (submitGuard.current) return;
    if (!formData.amount || !formData.description.trim() || !formData.category) {
      toast({ variant: 'destructive', title: 'Lengkapi form', description: 'Jumlah, kategori, dan keterangan wajib diisi.' });
      return;
    }

    const amount = parsePositiveFiniteAmount(formData.amount);
    const date = calendarDateToLocalInstant(formData.date, new Date());
    if (amount === null) {
      toast({ variant: 'destructive', title: 'Jumlah tidak valid', description: 'Masukkan Rupiah bulat lebih dari 0 tanpa karakter tambahan.' });
      return;
    }
    if (!date) {
      toast({ variant: 'destructive', title: 'Tanggal tidak valid', description: 'Pilih tanggal kalender yang benar.' });
      return;
    }

    // Commit immediately exactly once. The controlled dialog rejects every
    // dismissal path once the synchronous commit boundary has begun.
    setIsSubmitting(true);
    const succeeded = attemptTransactionCommit(submitGuard, () => onAddTransaction({
      type: formData.type,
      amount,
      category: formData.category,
      description: formData.description.trim(),
      date,
    }));
    if (!succeeded) {
      setIsSubmitting(false);
      toast({ variant: 'destructive', title: 'Gagal menyimpan', description: 'Transaksi belum tersimpan. Silakan coba lagi.' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) requestClose(); }}>
      <DialogContent
        hideClose={isSubmitting}
        closeLabel="Tutup formulir transaksi"
        className="max-w-md bg-card"
        onEscapeKeyDown={(event) => { if (isSubmitting) event.preventDefault(); }}
        onInteractOutside={(event) => { if (isSubmitting) event.preventDefault(); }}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          dateInputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Hash aria-hidden="true" className="h-5 w-5 text-primary" />
            Tambah Transaksi
          </DialogTitle>
          <DialogDescription>
            Isi tanggal, tipe, kategori, jumlah, dan keterangan transaksi. Semua kolom wajib diisi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
          <div>
            <Label htmlFor="transaction-date" className="font-medium">Tanggal *</Label>
            <Input ref={dateInputRef} id="transaction-date" type="date" value={formData.date} onChange={(event) => setFormData({ ...formData, date: event.target.value })} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="transaction-type" className="font-medium">Tipe Transaksi *</Label>
            <Select value={formData.type} onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value, category: '' })}>
              <SelectTrigger id="transaction-type" aria-describedby="transaction-type-help" className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="income">Pemasukan</SelectItem><SelectItem value="expense">Pengeluaran</SelectItem></SelectContent>
            </Select>
            <p id="transaction-type-help" className="sr-only">Pilih apakah uang masuk atau uang keluar.</p>
          </div>
          <div>
            <Label htmlFor="transaction-category" className="font-medium">Kategori *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger id="transaction-category" className="mt-1.5"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
              <SelectContent>{TRANSACTION_CATEGORIES[formData.type].map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="transaction-amount" className="font-medium">Jumlah (Rp) *</Label>
            <Input id="transaction-amount" type="number" min="1" step="1" inputMode="numeric" placeholder="0" value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} required className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="transaction-description" className="font-medium">Keterangan *</Label>
            <Textarea id="transaction-description" maxLength={500} aria-describedby="transaction-description-help" placeholder="Masukkan keterangan transaksi..." value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} rows={3} required className="mt-1.5 resize-none" />
            <p id="transaction-description-help" className="mt-1 text-xs text-muted-foreground">Maksimum 500 karakter.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={requestClose}>Batal</Button>
            <Button type="submit" disabled={isSubmitting} className="sm:flex-1" aria-disabled={isSubmitting}>
              {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionForm;
