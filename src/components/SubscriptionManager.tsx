import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DeleteConfirmation from '@/components/DeleteConfirmation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Ticket, Clock, RefreshCcw } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type { NewTransaction, Subscription, Transaction } from '@/domain/types';
import { addCalendarDays, calendarDateToLocalInstant, formatLocalCalendarDate, parseLocalCalendarDate } from '@/domain/calendar-date';
import { generateId } from '@/domain/id';
import { areSubscriptionListsEqual, reconcileSubscriptions, SUBSCRIPTION_COLORS, validateAndNormalizeSubscription } from '@/domain/subscription';

interface SubscriptionManagerProps {
  subscriptions: Subscription[];
  onSubscriptionsChange: React.Dispatch<React.SetStateAction<Subscription[]>>;
  onAddTransaction: (transaction: NewTransaction) => boolean;
  onAddReconciledTransactions: (transactions: Transaction[]) => void;
}

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  subscriptions,
  onSubscriptionsChange,
  onAddTransaction,
  onAddReconciledTransactions,
}) => {
  const today = formatLocalCalendarDate(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Subscription | null>(null);
  const [newSub, setNewSub] = useState({ name: '', amount: '', cycleDays: '30', startDate: today, createTransactionNow: true });
  const reconciledSignatureRef = useRef<string>('');

  useEffect(() => {
    const signature = JSON.stringify(subscriptions.map(({ id, nextPaymentDate, amount, cycleDays }) => [id, nextPaymentDate, amount, cycleDays]));
    if (signature === reconciledSignatureRef.current) return;
    reconciledSignatureRef.current = signature;

    const result = reconcileSubscriptions(subscriptions, new Date());
    if (result.transactions.length > 0) {
      onAddReconciledTransactions(result.transactions);
      toast({ title: 'Langganan Diperpanjang', description: `${result.transactions.length} tagihan jatuh tempo telah dicatat sesuai tanggalnya.` });
    }
    if (!areSubscriptionListsEqual(subscriptions, result.subscriptions)) onSubscriptionsChange(result.subscriptions);
    if (result.blockedSubscriptionIds.length > 0) {
      toast({ variant: 'destructive', title: 'Rekonsiliasi dibatasi', description: `${result.blockedSubscriptionIds.length} langganan terlalu tertinggal dan tidak diubah.` });
    }
  }, [subscriptions, onAddReconciledTransactions, onSubscriptionsChange]);

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = /^\d+$/.test(newSub.amount.trim()) ? Number(newSub.amount.trim()) : Number.NaN;
    const cycleDays = /^\d+$/.test(newSub.cycleDays) ? Number(newSub.cycleDays) : Number.NaN;
    const nextPaymentDate = addCalendarDays(newSub.startDate, cycleDays);
    let subscriptionId: string;
    try {
      subscriptionId = generateId('sub');
    } catch {
      toast({ variant: 'destructive', title: 'Gagal membuat langganan', description: 'ID aman tidak tersedia. Silakan coba lagi.' });
      return;
    }
    const result = validateAndNormalizeSubscription({
      id: subscriptionId,
      name: newSub.name,
      amount,
      startDate: newSub.startDate,
      cycleDays,
      nextPaymentDate,
      color: SUBSCRIPTION_COLORS[subscriptions.length % SUBSCRIPTION_COLORS.length],
    });
    if (!result.ok) {
      toast({ variant: 'destructive', title: 'Langganan tidak valid', description: result.error });
      return;
    }

    if (newSub.createTransactionNow && result.value.amount > 0) {
      const date = calendarDateToLocalInstant(newSub.startDate, new Date());
      if (!date) {
        toast({ variant: 'destructive', title: 'Tanggal tidak valid', description: 'Pembayaran pertama tidak dapat dicatat.' });
        return;
      }
      const transactionAdded = onAddTransaction({ type: 'expense', amount: result.value.amount, category: 'Langganan', description: `Langganan Baru: ${result.value.name}`, date });
      if (!transactionAdded) {
        toast({ variant: 'destructive', title: 'Langganan belum dibuat', description: 'Pembayaran pertama gagal dicatat. Silakan coba lagi.' });
        return;
      }
    }

    onSubscriptionsChange((current) => [...current, result.value]);
    setNewSub({ name: '', amount: '', cycleDays: '30', startDate: formatLocalCalendarDate(new Date()), createTransactionNow: true });
    setIsAdding(false);
    toast({ title: 'Berhasil', description: 'Langganan aktif dilacak!' });
  };

  const currentTime = new Date();
  const getDaysLeft = (nextPayment: string) => {
    const todayDate = parseLocalCalendarDate(formatLocalCalendarDate(currentTime));
    const target = parseLocalCalendarDate(nextPayment);
    if (!todayDate || !target) return 0;
    return Math.round((target.getTime() - todayDate.getTime()) / 86_400_000);
  };
  const getProgress = (nextPayment: string, cycleDays: number) => {
    const end = parseLocalCalendarDate(nextPayment);
    if (!end || cycleDays <= 0) return 0;
    const startDate = addCalendarDays(nextPayment, -cycleDays);
    const start = startDate ? parseLocalCalendarDate(startDate) : null;
    if (!start) return 0;
    return Math.min(100, Math.max(0, ((currentTime.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100));
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-3 min-[360px]:flex-row min-[360px]:items-center">
          <div className="min-w-0"><h2 className="flex items-center gap-2 font-display text-xl font-bold"><Ticket aria-hidden="true" className="h-6 w-6 shrink-0 text-primary" />Langganan Aktif</h2><p className="text-xs text-muted-foreground">Otomatis catat pengeluaran saat jatuh tempo.</p></div>
          <Button type="button" onClick={() => setIsAdding((open) => !open)} aria-expanded={isAdding} aria-controls="subscription-form" className="min-h-11 gap-2"><Plus aria-hidden="true" className="h-4 w-4" /> Baru</Button>
        </div>

        {isAdding && (
          <Card id="subscription-form" className="aureus-form-card animate-in slide-in-from-top-4">
            <CardHeader className="pb-4"><CardTitle className="text-base">Mulai Langganan</CardTitle><p className="text-xs leading-relaxed text-muted-foreground">Atur biaya dan jadwal pembayaran berikutnya.</p></CardHeader>
            <CardContent>
              <form onSubmit={handleAdd} className="aureus-form">
                <div className="form-grid">
                  <div className="form-field"><Label htmlFor="subscription-name">Nama Layanan</Label><Input id="subscription-name" maxLength={100} aria-describedby="subscription-name-help" placeholder="Netflix, Spotify..." value={newSub.name} onChange={(event) => setNewSub({ ...newSub, name: event.target.value })} required /><p id="subscription-name-help" className="form-helper">Maksimum 100 karakter.</p></div>
                  <div className="form-field"><Label htmlFor="subscription-amount">Biaya (Rp)</Label><Input id="subscription-amount" type="number" min="0" step="1" inputMode="numeric" placeholder="0" value={newSub.amount} onChange={(event) => setNewSub({ ...newSub, amount: event.target.value })} required /></div>
                </div>
                <div className="form-grid">
                  <div className="form-field"><Label htmlFor="subscription-start">Mulai Tanggal</Label><Input id="subscription-start" type="date" value={newSub.startDate} onChange={(event) => setNewSub({ ...newSub, startDate: event.target.value })} required /></div>
                  <div className="form-field"><Label htmlFor="subscription-cycle">Durasi (Hari)</Label><Input id="subscription-cycle" type="number" min="1" max="36600" step="1" inputMode="numeric" aria-describedby="subscription-cycle-help" placeholder="30" value={newSub.cycleDays} onChange={(event) => setNewSub({ ...newSub, cycleDays: event.target.value })} required /><p id="subscription-cycle-help" className="form-helper">Bilangan bulat 1–36.600 hari.</p></div>
                </div>
                <div className="form-choice"><Checkbox id="createNow" checked={newSub.createTransactionNow} onCheckedChange={(checked) => setNewSub({ ...newSub, createTransactionNow: checked === true })} className="mt-0.5" /><Label htmlFor="createNow">Buat transaksi pembayaran pertama pada tanggal mulai?</Label></div>
                <div className="form-actions"><Button type="button" variant="outline" onClick={() => setIsAdding(false)}>Batal</Button><Button type="submit">Mulai Tracking</Button></div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4">
          {subscriptions.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-muted bg-muted/20 px-4 py-12 text-center"><RefreshCcw aria-hidden="true" className="mx-auto mb-2 h-12 w-12 text-muted-foreground/30" /><p className="text-muted-foreground">Tidak ada langganan aktif.</p></div>
          ) : subscriptions.map((subscription) => {
            const daysLeft = getDaysLeft(subscription.nextPaymentDate);
            const progress = getProgress(subscription.nextPaymentDate, subscription.cycleDays);
            const start = parseLocalCalendarDate(subscription.startDate);
            const next = parseLocalCalendarDate(subscription.nextPaymentDate);
            const progressDescription = `${Math.round(progress)} persen siklus telah berlalu. ${daysLeft <= 0 ? 'Jatuh tempo hari ini.' : `${daysLeft} hari lagi.`}`;
            return (
              <article key={subscription.id} className="overflow-hidden rounded-xl border border-primary/20 bg-card shadow-sm transition-shadow hover:shadow-md">
                <div className="flex flex-col gap-4 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div aria-hidden="true" className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/10 bg-muted/30"><span className="text-[10px] font-bold uppercase leading-none text-muted-foreground">{start?.toLocaleDateString('id-ID', { month: 'short' })}</span><span className="text-lg font-black leading-none">{start?.getDate()}</span></div>
                      <div className="min-w-0"><h3 className="break-words text-base font-bold">{subscription.name}</h3><p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock aria-hidden="true" className="h-3 w-3" />{subscription.cycleDays} Hari / Siklus</p></div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1"><span className="max-w-[8rem] break-words text-right font-mono text-sm font-bold sm:max-w-none sm:text-base">Rp {subscription.amount.toLocaleString('id-ID')}</span><Button type="button" size="icon" variant="ghost" aria-label={`Hapus langganan ${subscription.name}`} className="h-11 w-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => setPendingDelete(subscription)}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button></div>
                  </div>
                  <div className="space-y-1"><div className="flex justify-between gap-2 text-xs font-medium"><span className={daysLeft <= 3 ? 'text-destructive' : 'text-muted-foreground'}>{daysLeft <= 0 ? 'Jatuh tempo hari ini!' : `${daysLeft} Hari lagi`}</span><span className="text-muted-foreground">{next?.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span></div><div role="progressbar" aria-label={`Siklus ${subscription.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={progressDescription} className="h-2 w-full overflow-hidden rounded-full bg-secondary"><div aria-hidden="true" className={`h-full rounded-full transition-all duration-500 ${daysLeft <= 3 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${progress}%` }} /></div></div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <DeleteConfirmation
        open={pendingDelete !== null}
        target={`Langganan “${pendingDelete?.name ?? ''}”`}
        subject="langganan"
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={() => {
          if (pendingDelete) onSubscriptionsChange((current) => current.filter(({ id }) => id !== pendingDelete.id));
          setPendingDelete(null);
        }}
      />
    </>
  );
};

export default SubscriptionManager;
