import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ReceiptText,
  Search,
  X,
} from 'lucide-react';
import type { Transaction, TransactionType } from '@/domain/types';
import { calendarDateToLocalInstant, formatLocalCalendarDate } from '@/domain/calendar-date';
import { parsePositiveFiniteAmount, transactionCalendarDate, validateAndNormalizeTransaction } from '@/domain/transaction-validation';
import DeleteConfirmation from '@/components/DeleteConfirmation';
import { toast } from '@/components/ui/use-toast';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';
import TransactionAmountField from '@/components/TransactionAmountField';

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
    income: visibleTransactions.filter(({ type }) => type === 'income').reduce((sum, { amount }) => sum + amount, 0),
    expense: visibleTransactions.filter(({ type }) => type === 'expense').reduce((sum, { amount }) => sum + amount, 0),
  }), [visibleTransactions]);

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

  const periodLabel = period === 'all' ? 'Semua bulan' : formatMonth(period);
  const hasListFilter = typeFilter !== 'all' || query.trim() !== '';
  const hasActiveFilter = period !== 'all' || hasListFilter;
  const resetFilters = () => {
    setPeriod('all');
    setTypeFilter('all');
    setQuery('');
  };

  return (
    <section className="activity-screen" aria-labelledby="activity-title">
      <header className="activity-page-header">
        <h1 id="activity-title">History</h1>
        <div className="activity-period-select">
          <CalendarDays aria-hidden="true" />
          <label className="sr-only" htmlFor="activity-period">Periode</label>
          <select id="activity-period" value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="all">Semua bulan</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>{formatMonth(month)}</option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </div>
      </header>

      <section className="activity-controls" aria-label="Cari dan filter transaksi">
        <div className="activity-search-field">
          <Search aria-hidden="true" />
          <label className="sr-only" htmlFor="activity-search">Cari transaksi</label>
          <input
            id="activity-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari deskripsi atau kategori"
            autoComplete="off"
          />
          {query && (
            <button type="button" aria-label="Hapus pencarian" onClick={() => setQuery('')}>
              <X aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="activity-type-filters" aria-label="Filter jenis transaksi">
          {([
            ['all', 'Semua'],
            ['expense', 'Pengeluaran'],
            ['income', 'Pemasukan'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={typeFilter === value} onClick={() => setTypeFilter(value)}>{label}</button>
          ))}
        </div>
      </section>

      <section className="activity-history" aria-labelledby="activity-history-title">
        <div className="activity-history-heading">
          <h2 id="activity-history-title">Transaksi</h2>
          <p aria-live="polite">{visibleTransactions.length} {hasListFilter ? 'hasil' : 'transaksi'}</p>
        </div>

        <div className="activity-history-overview" aria-label={`Ringkasan ${periodLabel}`}>
          <div className={`activity-overview-item is-income${totals.income === 0 ? ' is-zero' : ''}`}>
            <ArrowDownLeft aria-hidden="true" />
            <span><small>Pemasukan</small><strong>Rp{totals.income.toLocaleString('id-ID')}</strong></span>
          </div>
          <div className={`activity-overview-item${totals.expense === 0 ? ' is-zero' : ''}`}>
            <ArrowUpRight aria-hidden="true" />
            <span><small>Pengeluaran</small><strong>Rp{totals.expense.toLocaleString('id-ID')}</strong></span>
          </div>
        </div>

        {groups.length === 0 ? (
          <ActivityEmptyState hasTransactions={transactions.length > 0} hasActiveFilter={hasActiveFilter} onReset={resetFilters} />
        ) : groups.map(([day, entries]) => (
          <section key={day} className="activity-date-group" aria-labelledby={`activity-date-${day}`}>
            <header>
              <h3 id={`activity-date-${day}`}>{displayDate(day)}</h3>
              <span>{entries.length} transaksi</span>
            </header>
            <div className="activity-transaction-list">
              {entries.map((transaction) => (
                <ActivityTransactionRow key={transaction.id} transaction={transaction} onOpen={() => setEditing(transaction)} />
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

interface ActivityEmptyStateProps {
  hasTransactions: boolean;
  hasActiveFilter: boolean;
  onReset: () => void;
}

const ActivityEmptyState: React.FC<ActivityEmptyStateProps> = ({ hasTransactions, hasActiveFilter, onReset }) => (
  <div className="activity-empty">
    <span><ReceiptText aria-hidden="true" /></span>
    <strong>{hasTransactions ? 'Tidak ada transaksi yang cocok' : 'Belum ada transaksi'}</strong>
    <p>{hasTransactions ? 'Coba ubah pencarian, periode, atau jenis transaksi.' : 'Transaksi yang kamu catat akan tersusun di sini berdasarkan tanggal.'}</p>
    {hasTransactions && hasActiveFilter && <button type="button" onClick={onReset}>Tampilkan semua transaksi</button>}
  </div>
);

interface ActivityTransactionRowProps {
  transaction: Transaction;
  onOpen: () => void;
}

const ActivityTransactionRow: React.FC<ActivityTransactionRowProps> = ({ transaction, onOpen }) => {
  const TypeIcon = transaction.type === 'income' ? ArrowDownLeft : ArrowUpRight;

  return (
    <button
      type="button"
      className="activity-transaction-row"
      aria-label={`Edit ${transaction.description}, ${transaction.category}, ${transaction.type === 'income' ? 'pemasukan' : 'pengeluaran'} Rp${transaction.amount.toLocaleString('id-ID')}`}
      onClick={onOpen}
    >
      <span className={`activity-transaction-icon${transaction.type === 'income' ? ' is-income' : ''}`}>
        <TypeIcon aria-hidden="true" />
      </span>
      <span className="activity-transaction-copy">
        <strong>{transaction.description}</strong>
        <span>{transaction.category} · {formatTime(transaction.date)}</span>
      </span>
      <span className="activity-transaction-trailing">
        <strong className={`activity-transaction-amount${transaction.type === 'income' ? ' is-income' : ''}`}>
          {transaction.type === 'income' ? '+' : '−'}Rp{transaction.amount.toLocaleString('id-ID')}
        </strong>
        <ChevronRight aria-hidden="true" />
      </span>
    </button>
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

  return createPortal(
    <>
      <button type="button" className="activity-edit-backdrop" aria-label="Tutup edit transaksi" onClick={onClose} />
      <section className="activity-edit-sheet transaction-sheet" role="dialog" aria-modal="true" aria-labelledby="activity-edit-title">
        <header className="transaction-sheet-header">
          <div><h2 id="activity-edit-title">Edit transaksi</h2><p>{transaction.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'} · {transaction.category}</p></div>
          <button type="button" aria-label="Tutup edit transaksi" onClick={onClose}><X aria-hidden="true" /></button>
        </header>
        <form onSubmit={save} className="transaction-sheet-form activity-edit-form">
          <div className="transaction-type-choice" role="group" aria-label="Jenis transaksi">
            <button type="button" aria-pressed={type === 'expense'} onClick={() => setType('expense')}>Pengeluaran</button>
            <button type="button" aria-pressed={type === 'income'} onClick={() => setType('income')}>Pemasukan</button>
          </div>

          <TransactionAmountField
            id="edit-activity-amount"
            label="Jumlah"
            value={amount}
            onValueChange={setAmount}
            required
          />

          <div className="transaction-detail-fields">
            <div className="transaction-line-field">
              <label htmlFor="edit-activity-description">Deskripsi</label>
              <textarea id="edit-activity-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={2} required />
            </div>

            <div className="transaction-line-field">
              <label htmlFor="edit-activity-category">Kategori</label>
              <input id="edit-activity-category" value={category} onChange={(event) => setCategory(event.target.value)} maxLength={100} required />
            </div>

            <div className="transaction-line-field">
              <label htmlFor="edit-activity-date">Tanggal</label>
              <input id="edit-activity-date" type="date" max={today} value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
          </div>

          <div className="activity-edit-actions transaction-sheet-actions">
            <button type="button" className="transaction-delete-action" onClick={onDelete}>Hapus</button>
            <button type="submit" className="transaction-primary-action">Simpan perubahan</button>
          </div>
        </form>
      </section>
    </>,
    document.body,
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
