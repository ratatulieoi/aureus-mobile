import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DeleteConfirmation from '@/components/DeleteConfirmation';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Trash2, ArrowUp, ArrowDown, Wallet, ChevronDown } from 'lucide-react';
import type { Transaction } from '@/domain/types';
import { filterTransactionsByPeriod, resolveBinaryTransactionType } from '@/domain/period';

interface TransactionTableProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  selectedMonth: number;
  selectedYear: number;
  isAllTime?: boolean;
}

const TransactionTable: React.FC<TransactionTableProps> = ({
  transactions,
  onDeleteTransaction,
  selectedMonth,
  selectedYear,
  isAllTime = false,
}) => {
  const [showIncome, setShowIncome] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  useEffect(() => {
    try {
      const savedFilter = localStorage.getItem('transactionTableFilter');
      if (savedFilter === 'income' || savedFilter === 'expense') setShowIncome(savedFilter === 'income');
    } catch {
      // The in-memory default remains usable.
    }
  }, []);

  const handleFilterChange = (value: string) => {
    if (!value) return;
    const isIncome = value === 'income';
    setShowIncome(isIncome);
    try {
      localStorage.setItem('transactionTableFilter', value);
    } catch {
      // The filter remains available for this session.
    }
  };

  const periodTransactions = filterTransactionsByPeriod(transactions, {
    isAllTime,
    month: selectedMonth,
    year: selectedYear,
  });
  const requestedType = showIncome ? 'income' : 'expense';
  const effectiveType = resolveBinaryTransactionType(requestedType, periodTransactions);
  const effectiveShowIncome = effectiveType === 'income';
  const filteredTransactions = periodTransactions.filter((transaction) => transaction.type === effectiveType);

  useEffect(() => {
    if (effectiveShowIncome !== showIncome) setShowIncome(effectiveShowIncome);
  }, [effectiveShowIncome, showIncome]);

  useEffect(() => {
    if (selectedId && !filteredTransactions.some((transaction) => transaction.id === selectedId)) setSelectedId(null);
  }, [filteredTransactions, selectedId]);

  const totalAmount = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const toggleDetails = (id: string) => setSelectedId((current) => current === id ? null : id);

  return (
    <>
      <Card className="relative z-0 border-2 border-primary/20 shadow-sm">
        <CardHeader className="rounded-t-xl border-b border-primary/10 bg-muted/30 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Wallet aria-hidden="true" className="h-5 w-5 text-primary" />
              Buku Besar
            </CardTitle>

            <ToggleGroup
              type="single"
              value={effectiveType}
              onValueChange={handleFilterChange}
              aria-label="Filter jenis transaksi"
              className="grid w-full grid-cols-2 rounded-lg border border-primary/20 bg-background/50 p-1 sm:w-auto"
            >
              <ToggleGroupItem value="income" aria-label="Tampilkan pemasukan" className="min-h-11 min-w-0 px-2 data-[state=on]:bg-success data-[state=on]:text-success-foreground hover:bg-success/20 sm:px-4">
                ↑ Pemasukan
              </ToggleGroupItem>
              <ToggleGroupItem value="expense" aria-label="Tampilkan pengeluaran" className="min-h-11 min-w-0 px-2 data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground hover:bg-destructive/20 sm:px-4">
                ↓ Pengeluaran
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="group relative mt-4 min-w-0 overflow-hidden rounded-xl border border-dashed border-primary/30 bg-background p-4">
            <div aria-hidden="true" className={`absolute inset-0 opacity-10 ${effectiveShowIncome ? 'bg-success' : 'bg-destructive'}`} />
            <div className="relative min-w-0">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Total {effectiveShowIncome ? 'Masuk' : 'Keluar'}</p>
              <p className={`break-words text-2xl font-black tracking-tighter sm:text-3xl ${effectiveShowIncome ? 'text-success' : 'text-destructive'}`}>
                <span className="sr-only">{effectiveShowIncome ? 'Pemasukan' : 'Pengeluaran'}: </span>
                Rp {totalAmount.toLocaleString('id-ID')}
              </p>
            </div>
            {effectiveShowIncome
              ? <ArrowUp aria-hidden="true" className="absolute -bottom-2 -right-2 h-12 w-12 rotate-12 text-success/20 transition-transform duration-500 group-hover:rotate-0" />
              : <ArrowDown aria-hidden="true" className="absolute -bottom-2 -right-2 h-12 w-12 -rotate-12 text-destructive/20 transition-transform duration-500 group-hover:rotate-0" />}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-b-xl bg-muted/10 px-4 py-16 text-center text-muted-foreground">
              <div aria-hidden="true" className="mb-4 flex h-32 w-32 animate-float items-center justify-center rounded-full bg-muted/30">
                {effectiveShowIncome ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-16 w-16 text-muted-foreground/50">
                    <path d="M19 5c-1.5 0-2.8 0.6-3.8 1.5l-2.2 2.1c-0.2-0.5-0.7-0.9-1.3-1c-0.2-0.8-0.9-1.5-1.8-1.5h-0.9c-0.6-1.5-2.1-2.6-3.8-2.6C3 3.5 1.5 5 1.5 7v4c0 1.2 0.5 2.2 1.3 2.9l1.1 5.1h2.2l0.4-3h4l0.4 3h2.2l1.6-7.5c1.4-0.6 2.4-1.9 2.4-3.5S20.5 5 19 5z M8.5 7c0.6 0 1 0.4 1 1s-0.4 1-1 1s-1-0.4-1-1S7.9 7 8.5 7z" />
                    <path d="M16 4v-1M17 4v-1M14 6h1" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-16 w-16 text-muted-foreground/50">
                    <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4M4 6v12c0 1.1.9 2 2 2h14v-4M18 12a2 2 0 0 0 0 4h4v-4zM4 22l4-4M8 22l-4-4" />
                  </svg>
                )}
              </div>
              <p className="font-display text-lg font-medium">{effectiveShowIncome ? 'Zzz... Belum Ada Pemasukan' : 'Dompet Masih Aman'}</p>
              <p className="text-sm">{effectiveShowIncome ? 'Piggy bank-nya masih tidur.' : 'Belum ada laba-laba yang bersarang.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredTransactions.map((transaction) => {
                const detailsOpen = selectedId === transaction.id;
                const detailId = `transaction-details-${transaction.id}`;
                return (
                  <article key={transaction.id} className="group relative p-3 transition-colors hover:bg-primary/5 focus-within:bg-primary/5 sm:p-4">
                    <div aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-1 origin-center scale-y-0 bg-primary transition-transform group-hover:scale-y-100 group-focus-within:scale-y-100" />
                    <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-4">
                      <button
                        type="button"
                        onClick={() => toggleDetails(transaction.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape' && detailsOpen) {
                            event.preventDefault();
                            setSelectedId(null);
                          }
                        }}
                        aria-expanded={detailsOpen}
                        aria-controls={detailId}
                        aria-label={`${detailsOpen ? 'Sembunyikan' : 'Tampilkan'} detail transaksi ${transaction.description || transaction.category}`}
                        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-lg text-left ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-4"
                      >
                        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-primary/10 bg-muted/30">
                          <span className="text-[10px] font-bold uppercase leading-none text-muted-foreground">{new Date(transaction.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                          <span className="text-lg font-black leading-none">{new Date(transaction.date).getDate()}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <Badge variant="outline" className="mb-1 h-auto max-w-full whitespace-normal break-words border-primary/20 bg-primary/5 px-1.5 py-0.5 text-left text-[10px] font-normal text-foreground/80">{transaction.category}</Badge>
                          <span className="block break-words text-sm font-medium text-foreground/90">{transaction.description || 'Tanpa Keterangan'}</span>
                        </span>
                        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                      </button>

                      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                        <span className={`max-w-[9rem] break-words text-right text-sm font-bold tabular-nums sm:max-w-none sm:text-base ${effectiveShowIncome ? 'text-success' : 'text-destructive'}`}>
                          <span aria-hidden="true">{effectiveShowIncome ? '↑ +' : '↓ -'} </span>Rp {transaction.amount.toLocaleString('id-ID')}
                          <span className="sr-only"> {effectiveShowIncome ? 'pemasukan' : 'pengeluaran'}</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(transaction)}
                          aria-label={`Hapus transaksi ${transaction.description || transaction.category}`}
                          className="h-11 w-11 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {detailsOpen && (
                      <div id={detailId} className="ml-[3.75rem] mt-2 rounded-lg border border-primary/20 bg-popover px-3 py-2 text-sm text-popover-foreground sm:ml-16" role="region" aria-label="Detail transaksi">
                        <span className="font-semibold">Keterangan lengkap:</span> {transaction.description || 'Tanpa Keterangan'}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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

export default TransactionTable;
