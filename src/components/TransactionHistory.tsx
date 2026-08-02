import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DeleteConfirmation from '@/components/DeleteConfirmation';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trash2, Search, ReceiptText, ArrowUp, ArrowDown } from 'lucide-react';
import type { Transaction } from '@/domain/types';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ transactions, onDeleteTransaction }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (filterType === 'all' || transaction.type === filterType);
  });

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <>
      <Card className="min-w-0">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2"><ReceiptText aria-hidden="true" className="h-5 w-5" />Riwayat Transaksi</CardTitle>
          <div className="mt-4 flex min-w-0 flex-col gap-4 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <label htmlFor="transaction-history-search" className="sr-only">Cari riwayat transaksi</label>
              <Input id="transaction-history-search" type="search" placeholder="Cari transaksi..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="pl-10" />
            </div>
            <div role="group" aria-label="Filter riwayat transaksi" className="grid min-w-0 grid-cols-3 gap-2">
              <Button type="button" variant={filterType === 'all' ? 'default' : 'outline'} aria-pressed={filterType === 'all'} onClick={() => setFilterType('all')} className="min-w-0 px-2">Semua</Button>
              <Button type="button" variant={filterType === 'income' ? 'default' : 'outline'} aria-pressed={filterType === 'income'} onClick={() => setFilterType('income')} className={`min-w-0 px-2 ${filterType === 'income' ? '' : 'text-success'}`}>Masuk</Button>
              <Button type="button" variant={filterType === 'expense' ? 'default' : 'outline'} aria-pressed={filterType === 'expense'} onClick={() => setFilterType('expense')} className={`min-w-0 px-2 ${filterType === 'expense' ? '' : 'text-destructive'}`}>Keluar</Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          {filteredTransactions.length === 0 ? (
            <div className="px-2 py-8 text-center text-muted-foreground">{transactions.length === 0 ? 'Belum ada transaksi. Mulai tambahkan transaksi pertama Anda!' : 'Tidak ada transaksi yang sesuai dengan pencarian Anda.'}</div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <article key={transaction.id} className="flex min-w-0 flex-col gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between sm:p-4">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${transaction.type === 'income' ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>{transaction.type === 'income' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}</div>
                    <div className="min-w-0 flex-1"><Badge variant={transaction.type === 'income' ? 'secondary' : 'destructive'}>{transaction.type === 'income' ? '↑ Masuk' : '↓ Keluar'}</Badge><p className="mt-1 break-words text-sm">{transaction.description || 'Tanpa Keterangan'}</p><p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p></div>
                  </div>
                  <div className="flex min-w-0 items-center justify-between gap-2 min-[360px]:justify-end">
                    <div className={`break-words text-right text-base font-semibold sm:text-lg ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}><span aria-hidden="true">{transaction.type === 'income' ? '↑ +' : '↓ −'} </span>Rp {transaction.amount.toLocaleString('id-ID')}<span className="sr-only"> {transaction.type === 'income' ? 'pemasukan' : 'pengeluaran'}</span></div>
                    <Button type="button" variant="ghost" size="icon" aria-label={`Hapus transaksi ${transaction.description || transaction.category}`} onClick={() => setPendingDelete(transaction)} className="h-11 w-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"><Trash2 aria-hidden="true" className="h-4 w-4" /></Button>
                  </div>
                </article>
              ))}
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

export default TransactionHistory;
