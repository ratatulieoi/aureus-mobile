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
import type { TransactionType } from '@/domain/types';
import { parsePositiveFiniteAmount } from '@/domain/transaction-validation';
import { calendarDateToLocalInstant, formatLocalCalendarDate } from '@/domain/calendar-date';
import { attemptTransactionCommit } from '@/domain/transaction-action';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';

interface TransactionFormProps {
  onAddTransaction: (transaction: NewTransaction) => boolean;
  onClose: () => void;
  initialType?: TransactionType;
  initialCategory?: string;
  categories?: Readonly<Record<TransactionType, readonly string[]>>;
}

const TransactionForm: React.FC<TransactionFormProps> = ({
  onAddTransaction,
  onClose,
  initialType = 'expense',
  initialCategory = '',
  categories = TRANSACTION_CATEGORIES,
}) => {
  const lockedSelection = initialCategory.length > 0;
  const [formData, setFormData] = useState({
    type: initialType,
    amount: '',
    category: initialCategory,
    description: '',
    date: formatLocalCalendarDate(new Date()),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitGuard = useRef(false);
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
  useMobileBackDismiss(!isSubmitting, requestClose);

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
        className="max-w-md"
        onEscapeKeyDown={(event) => { if (isSubmitting) event.preventDefault(); }}
        onInteractOutside={(event) => { if (isSubmitting) event.preventDefault(); }}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Hash aria-hidden="true" className="h-5 w-5 text-primary" />
            Tambah Transaksi
          </DialogTitle>
          <DialogDescription>
            Isi nominal, deskripsi, dan tanggal. Semua kolom wajib diisi.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
          <div className="form-field">
            <Label htmlFor="transaction-date">Tanggal *</Label>
            <Input id="transaction-date" type="date" max={formatLocalCalendarDate(new Date())} value={formData.date} onChange={(event) => setFormData({ ...formData, date: event.target.value })} required />
          </div>
          {lockedSelection ? (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/25 bg-[hsl(var(--home-surface-muted))] p-3 text-sm">
              <div><span className="block text-xs text-muted-foreground">Jenis</span><strong>{formData.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}</strong></div>
              <div><span className="block text-xs text-muted-foreground">Kategori</span><strong>{formData.category}</strong></div>
            </div>
          ) : (
            <>
              <div className="form-field">
                <Label htmlFor="transaction-type">Tipe Transaksi *</Label>
                <Select value={formData.type} onValueChange={(value: TransactionType) => setFormData({ ...formData, type: value, category: '' })}>
                  <SelectTrigger id="transaction-type" aria-describedby="transaction-type-help"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income">Pemasukan</SelectItem><SelectItem value="expense">Pengeluaran</SelectItem></SelectContent>
                </Select>
                <p id="transaction-type-help" className="sr-only">Pilih apakah uang masuk atau uang keluar.</p>
              </div>
              <div className="form-field">
                <Label htmlFor="transaction-category">Kategori *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="transaction-category"><SelectValue placeholder="Pilih kategori..." /></SelectTrigger>
                  <SelectContent>{categories[formData.type].map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="form-field">
            <Label htmlFor="transaction-amount">Jumlah (Rp) *</Label>
            <div className="aureus-money-input"><span aria-hidden="true">Rp</span><Input id="transaction-amount" type="number" min="1" step="1" inputMode="numeric" placeholder="0" value={formData.amount} onChange={(event) => setFormData({ ...formData, amount: event.target.value })} required className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" /></div>
          </div>
          <div className="form-field">
            <Label htmlFor="transaction-description">Keterangan *</Label>
            <Textarea id="transaction-description" maxLength={500} aria-describedby="transaction-description-help" placeholder="Masukkan keterangan transaksi..." value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} rows={3} required className="resize-none" />
            <p id="transaction-description-help" className="form-helper">Maksimum 500 karakter.</p>
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
