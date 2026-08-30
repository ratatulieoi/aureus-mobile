import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import DeleteConfirmation from '@/components/DeleteConfirmation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Circle, AlertCircle, Check, Trash2, Square } from 'lucide-react';
import type { Budget, Transaction } from '@/domain/types';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';

interface BudgetManagerProps {
  budgets: Budget[];
  transactions: Transaction[];
  onAddBudget: (budget: Omit<Budget, 'id'>) => void;
  onDeleteBudget: (id: string) => void;
  selectedMonth: number;
  selectedYear: number;
}

const CATEGORIES = [
  'Makanan & Minuman', 'Transportasi', 'Belanja', 'Hiburan', 'Kesehatan',
  'Pendidikan', 'Tagihan', 'Investasi', 'Lainnya',
];

const BudgetManager: React.FC<BudgetManagerProps> = ({
  budgets,
  transactions,
  onAddBudget,
  onDeleteBudget,
  selectedMonth,
  selectedYear,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null);
  const [newBudget, setNewBudget] = useState({ category: '', amount: '' });
  useMobileBackDismiss(showForm, () => setShowForm(false));

  const monthlyBudgets = budgets.filter((budget) => budget.month === selectedMonth && budget.year === selectedYear);
  const monthlyTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.date);
    return date.getMonth() === selectedMonth && date.getFullYear() === selectedYear && transaction.type === 'expense';
  });

  const handleAddBudget = () => {
    const amount = Number(newBudget.amount);
    if (!newBudget.category || !Number.isFinite(amount) || amount <= 0) return;
    onAddBudget({ category: newBudget.category, amount, month: selectedMonth, year: selectedYear });
    setNewBudget({ category: '', amount: '' });
    setShowForm(false);
  };

  const getBudgetStatus = (budget: Budget) => {
    const spent = monthlyTransactions.filter(({ category }) => category === budget.category).reduce((sum, transaction) => sum + transaction.amount, 0);
    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    return { spent, percentage, remaining: budget.amount - spent };
  };

  const totalBudget = monthlyBudgets.reduce((sum, budget) => sum + budget.amount, 0);
  const totalSpent = monthlyBudgets.reduce((sum, budget) => sum + getBudgetStatus(budget).spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  return (
    <>
      <div className="space-y-6">
        <section className="min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-6" aria-labelledby="budget-overview-title">
          <div className="mb-6 flex min-w-0 flex-col items-start justify-between gap-3 min-[360px]:flex-row min-[360px]:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <div aria-hidden="true" className="shrink-0 rounded-lg bg-primary/10 p-2"><Square className="h-5 w-5 text-primary" /></div>
              <div className="min-w-0"><h3 id="budget-overview-title" className="break-words text-lg font-semibold">Budget Overview</h3><p className="text-xs text-muted-foreground">{new Date(selectedYear, selectedMonth).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p></div>
            </div>
            <Button type="button" onClick={() => setShowForm((open) => !open)} aria-expanded={showForm} aria-controls="budget-add-form" className="min-w-0 gap-2 whitespace-normal"><Plus aria-hidden="true" className="h-4 w-4" />Tambah Budget</Button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="min-w-0 rounded-lg border border-primary/20 bg-primary/5 p-4 text-center"><p className="mb-1 text-sm font-medium text-muted-foreground">Total Budget</p><p className="break-words text-xl font-bold text-accent-text">Rp {totalBudget.toLocaleString('id-ID')}</p></div>
            <div className="min-w-0 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center"><p className="mb-1 text-sm font-medium text-muted-foreground">Total Pengeluaran</p><p className="break-words text-xl font-bold text-destructive">− Rp {totalSpent.toLocaleString('id-ID')}</p></div>
            <div className={`min-w-0 rounded-lg border p-4 text-center ${totalRemaining >= 0 ? 'border-success/20 bg-success/5' : 'border-destructive/20 bg-destructive/5'}`}><p className="mb-1 text-sm font-medium text-muted-foreground">Sisa Budget</p><p className={`break-words text-xl font-bold ${totalRemaining >= 0 ? 'text-success' : 'text-destructive'}`}>{totalRemaining >= 0 ? 'Tersedia: ' : 'Melebihi: '}Rp {Math.abs(totalRemaining).toLocaleString('id-ID')}</p></div>
          </div>

          {showForm && (
            <div id="budget-add-form" className="aureus-inline-form animate-in slide-in-from-top-2">
              <div><h4>Tambah budget baru</h4><p>Tetapkan batas pengeluaran untuk satu kategori.</p></div>
              <div className="form-grid">
                <div className="form-field"><Label htmlFor="budget-category">Kategori</Label><Select value={newBudget.category} onValueChange={(category) => setNewBudget((current) => ({ ...current, category }))}><SelectTrigger id="budget-category"><SelectValue placeholder="Pilih kategori" /></SelectTrigger><SelectContent>{CATEGORIES.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent></Select></div>
                <div className="form-field"><Label htmlFor="budget-amount">Jumlah budget</Label><Input id="budget-amount" type="number" min="1" step="1" inputMode="numeric" placeholder="0" value={newBudget.amount} onChange={(event) => setNewBudget((current) => ({ ...current, amount: event.target.value }))} /></div>
              </div>
              <div className="form-actions"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Batal</Button><Button type="button" onClick={handleAddBudget}>Simpan</Button></div>
            </div>
          )}
        </section>

        {monthlyBudgets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {monthlyBudgets.map((budget) => {
              const { spent, percentage, remaining } = getBudgetStatus(budget);
              const isOverBudget = percentage > 100;
              const isNearLimit = percentage > 80 && !isOverBudget;
              const status = isOverBudget ? 'Melebihi batas' : isNearLimit ? 'Mendekati batas' : 'Dalam batas';
              const valueText = `${percentage.toFixed(1)} persen terpakai. ${status}. ${remaining >= 0 ? `Sisa Rp ${remaining.toLocaleString('id-ID')}` : `Melebihi Rp ${Math.abs(remaining).toLocaleString('id-ID')}`}.`;
              return (
                <article key={budget.id} className="min-w-0 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex min-w-0 items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {isOverBudget || isNearLimit ? <AlertCircle aria-hidden="true" className={`h-5 w-5 shrink-0 ${isOverBudget ? 'text-destructive' : 'text-accent-text'}`} /> : <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-success" />}
                      <div className="min-w-0"><h3 className="break-words font-semibold">{budget.category}</h3><p className={`text-xs font-semibold ${isOverBudget ? 'text-destructive' : isNearLimit ? 'text-accent-text' : 'text-success'}`}>{status}</p></div>
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setPendingDelete(budget)} aria-label={`Hapus budget ${budget.category}`} className="h-11 w-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex min-w-0 flex-col justify-between gap-1 text-sm min-[360px]:flex-row"><span className="text-muted-foreground">Pengeluaran</span><span className="break-words text-right font-medium">Rp {spent.toLocaleString('id-ID')} / Rp {budget.amount.toLocaleString('id-ID')}</span></div>
                    <Progress value={Math.min(Math.max(percentage, 0), 100)} aria-label={`Pemakaian budget ${budget.category}`} aria-valuetext={valueText} className={`h-2 ${isOverBudget ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-accent-text' : '[&>div]:bg-success'}`} />
                    <div className="flex min-w-0 flex-col justify-between gap-1 text-xs min-[360px]:flex-row"><span className="text-muted-foreground">{percentage.toFixed(1)}% terpakai</span><span className={`break-words font-medium ${remaining >= 0 ? 'text-success' : 'text-destructive'}`}>{remaining >= 0 ? `Sisa: Rp ${remaining.toLocaleString('id-ID')}` : `Melebihi: Rp ${Math.abs(remaining).toLocaleString('id-ID')}`}</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border bg-card px-4 py-12 text-center"><Circle aria-hidden="true" className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" /><p className="text-lg text-muted-foreground">Belum ada budget yang ditetapkan</p><p className="mt-1 text-sm text-muted-foreground">Mulai buat budget untuk kontrol keuangan yang lebih baik!</p></div>
        )}
      </div>

      <DeleteConfirmation
        open={pendingDelete !== null}
        target={`Budget “${pendingDelete?.category ?? ''}”`}
        subject="budget"
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={() => {
          if (pendingDelete) onDeleteBudget(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
};

export default BudgetManager;
