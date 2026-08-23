import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Transaction, TransactionType } from '@/domain/types';
import { calendarDateToLocalInstant, formatLocalCalendarDate } from '@/domain/calendar-date';
import { parsePositiveFiniteAmount, transactionCalendarDate, validateAndNormalizeTransaction } from '@/domain/transaction-validation';
import DeleteConfirmation from '@/components/DeleteConfirmation';
import { toast } from '@/components/ui/use-toast';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';

interface ActivityScreenProps {
  transactions: Transaction[];
  onUpdateTransaction: (transaction: Transaction) => boolean;
  onDeleteTransaction: (id: string) => void;
}

type TypeFilter = 'all' | TransactionType;

const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' });
const dateFormatter = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const ActivityScreen: React.FC<ActivityScreenProps> = ({ transactions, onUpdateTransaction, onDeleteTransaction }) => {
  const currentMonth = formatLocalCalendarDate(new Date()).slice(0, 7);
  const [period, setPeriod] = useState(currentMonth);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const availableMonths = useMemo(() => {
    const values = new Set<string>([currentMonth]);
    for (const transaction of transactions) {
      const day = transactionCalendarDate(transaction);
      if (day) values.add(day.slice(0, 7));
    }
    return [...values].sort().reverse();
  }, [currentMonth, transactions]);

  const periodTransactions = useMemo(() => transactions.filter((transaction) => {
    const day = transactionCalendarDate(transaction);
    return period === 'all' || day?.startsWith(period);
  }), [period, transactions]);

  const visibleTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
    return periodTransactions
      .filter((transaction) => typeFilter === 'all' || transaction.type === typeFilter)
      .filter((transaction) => !normalizedQuery || `${transaction.description} ${transaction.category}`.toLocaleLowerCase('id-ID').includes(normalizedQuery))
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [periodTransactions, query, typeFilter]);

  const totals = useMemo(() => ({
    income: periodTransactions.filter(({ type }) => type === 'income').reduce((sum, { amount }) => sum + amount, 0),
    expense: periodTransactions.filter(({ type }) => type === 'expense').reduce((sum, { amount }) => sum + amount, 0),
  }), [periodTransactions]);

  const groups = useMemo(() => {
    const grouped = new Map<string, Transaction[]>();
    for (const transaction of visibleTransactions) {
      const day = transactionCalendarDate(transaction);
      if (!day) continue;
      const current = grouped.get(day) ?? [];
      current.push(transaction);
      grouped.set(day, current);
    }
    return [...grouped.entries()];
  }, [visibleTransactions]);

  return (
    <section className="activity-screen" aria-labelledby="activity-title">
      <h1 id="activity-title">Aktivitas</h1>

      <section className="activity-filters" aria-label="Cari dan filter transaksi">
        <label htmlFor="activity-period">Periode</label>
        <select id="activity-period" value={period} onChange={(event) => setPeriod(event.target.value)}>
          <option value="all">Semua bulan</option>
          {availableMonths.map((month) => (
            <option key={month} value={month}>{formatMonth(month)}</option>
          ))}
        </select>

        <label htmlFor="activity-search">Cari transaksi</label>
        <input
          id="activity-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Deskripsi atau kategori"
          autoComplete="off"
        />

        <div className="activity-type-filters" aria-label="Filter jenis transaksi">
          {([
            ['all', 'Semua'],
            ['expense', 'Pengeluaran'],
            ['income', 'Pemasukan'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={typeFilter === value} onClick={() => setTypeFilter(value)}>{label}</button>
          ))}
        </div>

        <div className={`activity-summary ${typeFilter === 'all' ? '' : 'is-single'}`} aria-live="polite">
          {typeFilter !== 'expense' && <div><span>Pemasukan</span><strong>Rp{totals.income.toLocaleString('id-ID')}</strong></div>}
          {typeFilter !== 'income' && <div><span>Pengeluaran</span><strong>Rp{totals.expense.toLocaleString('id-ID')}</strong></div>}
        </div>
      </section>

      <section className="activity-history" aria-label="Riwayat transaksi">
        {groups.length === 0 ? (
          <p className="activity-empty">Tidak ada transaksi yang cocok.</p>
        ) : groups.map(([day, entries]) => (
          <section key={day} className="activity-date-group" aria-labelledby={`activity-date-${day}`}>
            <h2 id={`activity-date-${day}`}>{displayDate(day)}</h2>
            <div className="activity-transaction-list">
              {entries.map((transaction) => (
                <button key={transaction.id} type="button" className="activity-transaction-row" onClick={() => setEditing(transaction)}>
                  <span className="activity-transaction-copy">
                    <strong>{transaction.description}</strong>
                    <span>{transaction.category} · {formatTime(transaction.date)}</span>
                  </span>
                  <span className={`activity-transaction-amount ${transaction.type === 'income' ? 'is-income' : ''}`}>
                    {transaction.type === 'income' ? '+' : '−'}Rp{transaction.amount.toLocaleString('id-ID')}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </section>

      {editing && (
        <ActivityEditSheet
          transaction={editing}
          onClose={() => setEditing(null)}
          onDelete={() => { setPendingDelete(editing); setEditing(null); }}
          onSave={(next) => {
            if (!onUpdateTransaction(next)) return false;
            setEditing(null);
            toast({ title: 'Perubahan disimpan', description: `${next.description} sudah diperbarui.` });
            return true;
          }}
        />
      )}

      <DeleteConfirmation
        open={pendingDelete !== null}
        target={`Transaksi “${pendingDelete?.description ?? ''}”`}
        subject="transaksi"
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={() => {
          if (pendingDelete) onDeleteTransaction(pendingDelete.id);
          setPendingDelete(null);
          toast({ title: 'Transaksi dihapus' });
        }}
      />
    </section>
  );
};

interface ActivityEditSheetProps {
  transaction: Transaction;
  onClose: () => void;
  onDelete: () => void;
  onSave: (transaction: Transaction) => boolean;
}

const ActivityEditSheet: React.FC<ActivityEditSheetProps> = ({ transaction, onClose, onDelete, onSave }) => {
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [description, setDescription] = useState(transaction.description);
  const [category, setCategory] = useState(transaction.category);
  const [date, setDate] = useState(transactionCalendarDate(transaction) ?? formatLocalCalendarDate(new Date()));
  const today = formatLocalCalendarDate(new Date());
  useMobileBackDismiss(true, onClose);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = parsePositiveFiniteAmount(amount);
    const instant = calendarDateToLocalInstant(date, new Date(transaction.date));
    if (parsedAmount === null || !instant || date > today || !description.trim() || !category.trim()) {
      toast({ variant: 'destructive', title: 'Perubahan belum disimpan', description: 'Periksa jenis, jumlah, deskripsi, kategori, dan tanggal.' });
      return;
    }
    const result = validateAndNormalizeTransaction({
      ...transaction,
      type,
      amount: parsedAmount,
      description: description.trim(),
      category: category.trim(),
      date: instant,
    }, { requireId: true });
    if (!result.ok) {
      toast({ variant: 'destructive', title: 'Transaksi tidak valid', description: result.error });
      return;
    }
    onSave(result.value);
  };

  return (
    <>
      <button type="button" className="activity-edit-backdrop" aria-label="Tutup edit transaksi" onClick={onClose} />
      <section className="activity-edit-sheet" role="dialog" aria-modal="true" aria-labelledby="activity-edit-title">
        <header>
          <div><h2 id="activity-edit-title">Edit transaksi</h2><p>Ubah atau hapus transaksi ini.</p></div>
          <button type="button" aria-label="Tutup edit transaksi" onClick={onClose}><X aria-hidden="true" /></button>
        </header>
        <form onSubmit={save}>
          <label htmlFor="edit-activity-type">Jenis</label>
          <select id="edit-activity-type" value={type} onChange={(event) => setType(event.target.value as TransactionType)}>
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>

          <label htmlFor="edit-activity-amount">Jumlah</label>
          <div className="activity-rupiah-input"><span>Rp</span><input id="edit-activity-amount" inputMode="numeric" value={amount ? Number(amount).toLocaleString('id-ID') : ''} onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))} required /></div>

          <label htmlFor="edit-activity-description">Deskripsi</label>
          <input id="edit-activity-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} required />

          <label htmlFor="edit-activity-category">Kategori</label>
          <input id="edit-activity-category" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={100} required />

          <label htmlFor="edit-activity-date">Tanggal</label>
          <input id="edit-activity-date" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} required />

          <div className="activity-edit-actions">
            <button type="button" onClick={onDelete}>Hapus</button>
            <button type="submit">Simpan perubahan</button>
          </div>
        </form>
      </section>
    </>
  );
};

function formatMonth(value: string): string {
  return monthFormatter.format(new Date(`${value}-01T12:00:00`));
}

function displayDate(value: string): string {
  const today = formatLocalCalendarDate(new Date());
  if (value === today) return 'Hari ini';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (value === formatLocalCalendarDate(yesterday)) return 'Kemarin';
  return dateFormatter.format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '00.00' : date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export default ActivityScreen;
