import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DeleteConfirmation from '@/components/DeleteConfirmation';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ArrowUp, ArrowDown, PieChart, Layers } from 'lucide-react';
import type { Transaction } from '@/domain/types';
import { filterTransactionsByPeriod, normalizeCategoryFilter, normalizeTypeFilter } from '@/domain/period';

interface TransactionByCategoryProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  selectedMonth: number;
  selectedYear: number;
  isAllTime?: boolean;
}

const TransactionByCategory: React.FC<TransactionByCategoryProps> = ({
  transactions,
  onDeleteTransaction,
  selectedMonth,
  selectedYear,
  isAllTime = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const handleTypeChange = (value: string) => {
    if (value === 'all' || value === 'income' || value === 'expense') setSelectedType(value);
  };

  const periodTransactions = filterTransactionsByPeriod(transactions, { isAllTime, month: selectedMonth, year: selectedYear });
  const categories = Array.from(new Set(periodTransactions.map((transaction) => transaction.category))).sort();
  const effectiveCategory = normalizeCategoryFilter(selectedCategory, categories);
  const effectiveType = normalizeTypeFilter(selectedType, periodTransactions);

  useEffect(() => {
    if (effectiveCategory !== selectedCategory) setSelectedCategory(effectiveCategory);
    if (effectiveType !== selectedType) setSelectedType(effectiveType);
  }, [effectiveCategory, effectiveType, selectedCategory, selectedType]);

  const filteredTransactions = periodTransactions.filter((transaction) => {
    const matchesCategory = effectiveCategory === 'all' || transaction.category === effectiveCategory;
    const matchesType = effectiveType === 'all' || transaction.type === effectiveType;
    return matchesCategory && matchesType;
  });

  const transactionsByCategory = filteredTransactions.reduce((groups, transaction) => {
    (groups[transaction.category] ??= []).push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-primary/10 bg-card/50 p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <div aria-hidden="true" className="rounded-lg bg-primary/20 p-2"><Layers className="h-5 w-5 text-foreground" /></div>
            <div><h3 className="font-display text-lg font-bold leading-none">Breakdown</h3><p className="text-xs text-muted-foreground">Per Kategori</p></div>
          </div>
          <div className="grid w-full min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:w-auto">
            <div className="min-w-0">
              <Label htmlFor="category-type-filter" className="sr-only">Filter tipe transaksi</Label>
              <Select value={selectedType} onValueChange={handleTypeChange}>
                <SelectTrigger id="category-type-filter" className="w-full min-w-0 border-primary/20 bg-background sm:w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Semua Tipe</SelectItem><SelectItem value="income">Pemasukan</SelectItem><SelectItem value="expense">Pengeluaran</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="min-w-0">
              <Label htmlFor="category-name-filter" className="sr-only">Filter kategori transaksi</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-name-filter" className="w-full min-w-0 border-primary/20 bg-background sm:w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">Semua Kategori</SelectItem>{categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {Object.keys(transactionsByCategory).length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-muted/20 px-4 py-20 text-center">
            <PieChart aria-hidden="true" className="mx-auto mb-4 h-16 w-16 animate-spin-slow text-muted-foreground/30" />
            <p className="font-medium text-muted-foreground">Tidak ada data untuk ditampilkan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {Object.entries(transactionsByCategory).map(([category, categoryTransactions]) => {
              const totalIncome = categoryTransactions.filter(({ type }) => type === 'income').reduce((sum, { amount }) => sum + amount, 0);
              const totalExpense = categoryTransactions.filter(({ type }) => type === 'expense').reduce((sum, { amount }) => sum + amount, 0);
              return (
                <section key={category} className="group relative min-w-0 overflow-hidden rounded-2xl border border-primary/10 bg-card transition-all duration-300 hover:shadow-lg">
                  <div className="flex min-w-0 flex-col gap-3 border-b border-primary/5 bg-gradient-to-r from-muted/50 to-muted/10 p-4 min-[360px]:flex-row min-[360px]:items-start min-[360px]:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge variant="outline" className="max-w-full whitespace-normal break-words border-primary/20 bg-background px-3 py-1 text-sm font-bold">{category}</Badge>
                      <span className="rounded-full bg-background/50 px-2 py-0.5 font-mono text-xs text-muted-foreground">{categoryTransactions.length} item</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-start font-mono text-xs min-[360px]:items-end">
                      {totalIncome > 0 && <span className="flex items-center gap-1 text-success"><ArrowUp aria-hidden="true" className="h-3 w-3" /><span className="sr-only">Pemasukan </span>+ {totalIncome.toLocaleString('id-ID')}</span>}
                      {totalExpense > 0 && <span className="flex items-center gap-1 text-destructive"><ArrowDown aria-hidden="true" className="h-3 w-3" /><span className="sr-only">Pengeluaran </span>- {totalExpense.toLocaleString('id-ID')}</span>}
                    </div>
                  </div>

                  <div>
                    {categoryTransactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex min-w-0 items-center justify-between gap-2 border-b border-dashed border-primary/10 p-3 text-sm transition-colors last:border-0 hover:bg-primary/5">
                        <div className="min-w-0 flex-1"><span className="block break-words font-medium text-foreground/90">{transaction.description || 'Tanpa Keterangan'}</span><span className="text-[10px] text-muted-foreground">{new Date(transaction.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span></div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className={`max-w-[7.5rem] break-words text-right font-mono font-bold min-[360px]:max-w-none ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}><span aria-hidden="true">{transaction.type === 'income' ? '↑ +' : '↓ -'} </span>{transaction.amount.toLocaleString('id-ID')}<span className="sr-only"> {transaction.type === 'income' ? 'pemasukan' : 'pengeluaran'}</span></span>
                          <Button type="button" variant="ghost" size="icon" aria-label={`Hapus transaksi ${transaction.description || category}`} className="h-11 w-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => setPendingDelete(transaction)}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                    {categoryTransactions.length > 5 && <div className="bg-muted/20 p-2 text-center text-xs italic text-muted-foreground">…dan {categoryTransactions.length - 5} lainnya</div>}
                  </div>
                  <div aria-hidden="true" className="h-2 w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA0IiBwcmVzZXJ2ZUFzcGVjdHJhdGlvPSJub25lIj48cGF0aCBkPSJNIDAgMCBMIDYgNCBMIDEyIDAgWiIgZmlsbD0iI2Y1ZjVkYyIvPjwvc3ZnPg==')] bg-contain bg-bottom opacity-50" />
                </section>
              );
            })}
          </div>
        )}
      </div>

      <DeleteConfirmation
        open={pendingDelete !== null}
        target={`Transaksi “${pendingDelete?.description || pendingDelete?.category || ''}”`}
        subject="transaksi"
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={() => {
          if (pendingDelete) onDeleteTransaction(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </>
  );
};

export default TransactionByCategory;
