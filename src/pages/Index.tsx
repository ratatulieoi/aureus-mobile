import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';
import Header, { type NavTab } from '@/components/Header';
import DashboardHome from '@/components/DashboardHome';
import QuickTransactionEntry from '@/components/QuickTransactionEntry';
import MoreMenu from '@/components/MoreMenu';
import CategoryManager from '@/components/CategoryManager';
import LazyFeature from '@/components/LazyFeature';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import type { CategoryCatalog, NewTransaction, Subscription, Transaction, TransactionType } from '@/domain/types';
import {
  addPrevalidatedTransaction,
  emptyLedgerSnapshot,
  hydrateLedger,
  mergeTransactionsIdempotently,
  persistLedger,
} from '@/domain/ledger';
import { validateNewTransaction } from '@/domain/transaction-validation';
import type { DashboardPeriod } from '@/domain/dashboard-period';

const TransactionTable = lazy(() => import('@/components/TransactionTable'));
const TransactionByCategory = lazy(() => import('@/components/TransactionByCategory'));
const StatisticsChart = lazy(() => import('@/components/StatisticsChart'));
const SubscriptionManager = lazy(() => import('@/components/SubscriptionManager'));

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

interface EntrySelection {
  type: TransactionType;
  category: string;
  mode: 'normal' | 'voice';
}

const Index = () => {
  const [storage] = useState<Storage | null>(() => {
    try { return window.localStorage; } catch { return null; }
  });
  const [initial] = useState(() => storage
    ? hydrateLedger(storage)
    : { snapshot: emptyLedgerSnapshot(), source: 'empty' as const, canPersist: false });

  const [transactions, setTransactions] = useState<Transaction[]>(initial.snapshot.transactions);
  const transactionsRef = useRef(transactions);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initial.snapshot.subscriptions);
  const [categories, setCategories] = useState<CategoryCatalog>(initial.snapshot.categories);
  const [canPersist, setCanPersist] = useState(initial.canPersist);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [activeType, setActiveType] = useState<TransactionType>('expense');
  const [period, setPeriod] = useState<DashboardPeriod>({ kind: 'quick', id: 'today' });
  const [entry, setEntry] = useState<EntrySelection | null>(null);
  const [openCategoryAdd, setOpenCategoryAdd] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [activityMonth, setActivityMonth] = useState(() => new Date().getMonth());
  const [activityYear, setActivityYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    if (!canPersist || !storage) return;
    try {
      persistLedger(storage, { transactions, subscriptions, categories });
    } catch (error) {
      console.error('Gagal menyimpan ledger', error);
    }
  }, [transactions, subscriptions, categories, canPersist, storage]);

  useEffect(() => {
    const schedule = () => {
      const current = new Date();
      const nextMidnight = new Date(current);
      nextMidnight.setHours(24, 0, 0, 50);
      return window.setTimeout(() => {
        setNow(new Date());
        midnightTimer = schedule();
      }, Math.max(1_000, nextMidnight.getTime() - current.getTime()));
    };
    let midnightTimer = schedule();
    return () => window.clearTimeout(midnightTimer);
  }, []);

  const addTransaction = useCallback((candidate: NewTransaction) => {
    let validated: NewTransaction;
    try {
      validated = validateNewTransaction(candidate);
    } catch (error) {
      console.error('Transaksi ditolak', error);
      toast({ variant: 'destructive', title: 'Transaksi belum disimpan', description: 'Periksa nominal, deskripsi, kategori, dan tanggal.' });
      return false;
    }
    try {
      const next = addPrevalidatedTransaction(transactionsRef.current, validated);
      transactionsRef.current = next;
      setTransactions(next);
      setEntry(null);
      toast({ title: 'Transaksi disimpan', description: `${validated.description} dicatat pada ${validated.category}.` });
      return true;
    } catch (error) {
      console.error('Transaksi gagal disimpan', error);
      toast({ variant: 'destructive', title: 'Gagal menyimpan', description: 'Transaksi belum tersimpan. Coba lagi.' });
      return false;
    }
  }, []);

  const addReconciledTransactions = useCallback((additions: Transaction[]) => {
    const next = mergeTransactionsIdempotently(transactionsRef.current, additions);
    transactionsRef.current = next;
    setTransactions(next);
  }, []);

  const deleteTransaction = (id: string) => {
    const next = transactionsRef.current.filter((transaction) => transaction.id !== id);
    transactionsRef.current = next;
    setTransactions(next);
  };

  const restore = (snapshot: { transactions: Transaction[]; subscriptions: Subscription[]; categories: CategoryCatalog }) => {
    setCanPersist(true);
    transactionsRef.current = snapshot.transactions;
    setTransactions(snapshot.transactions);
    setSubscriptions(snapshot.subscriptions);
    setCategories(snapshot.categories);
  };

  const availableActivityYears = Array.from(new Set([
    now.getFullYear(),
    ...transactions.map((transaction) => new Date(transaction.date).getFullYear()),
  ])).filter(Number.isFinite).sort((left, right) => right - left);

  const openEntry = (category: string, voice: boolean) => {
    setEntry({ type: activeType, category, mode: voice ? 'voice' : 'normal' });
  };

  const openAddCategory = () => setOpenCategoryAdd(true);

  return (
    <div className="app-shell">
      <div className="mobile-frame">
        <Header activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); setOpenCategoryAdd(false); }} />
        <main id="main-content" className="app-content">
          {activeTab === 'home' && (
            <DashboardHome
              transactions={transactions}
              categories={categories}
              activeType={activeType}
              onActiveTypeChange={setActiveType}
              period={period}
              onPeriodChange={setPeriod}
              now={now}
              onOpenEntry={openEntry}
              onAddCategory={openAddCategory}
            />
          )}

          {activeTab === 'activity' && (
            <section className="feature-page" aria-labelledby="activity-page-title">
              <div className="feature-heading"><h1 id="activity-page-title">Aktivitas</h1><p>Riwayat dan statistik transaksi.</p></div>
              <div className="activity-period-controls">
                <Calendar aria-hidden="true" />
                <div><Label htmlFor="activity-month">Bulan</Label><Select value={String(activityMonth)} onValueChange={(value) => setActivityMonth(Number(value))}><SelectTrigger id="activity-month"><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((month, index) => <SelectItem key={month} value={String(index)}>{month}</SelectItem>)}</SelectContent></Select></div>
                <div><Label htmlFor="activity-year">Tahun</Label><Select value={String(activityYear)} onValueChange={(value) => setActivityYear(Number(value))}><SelectTrigger id="activity-year"><SelectValue /></SelectTrigger><SelectContent>{availableActivityYears.map((year) => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <LazyFeature featureName="Aktivitas" resetKey={`${activityMonth}-${activityYear}`}>
                <div className="feature-stack">
                  <TransactionTable transactions={transactions} onDeleteTransaction={deleteTransaction} selectedMonth={activityMonth} selectedYear={activityYear} />
                  <StatisticsChart transactions={transactions} selectedMonth={activityMonth} selectedYear={activityYear} />
                  <TransactionByCategory transactions={transactions} onDeleteTransaction={deleteTransaction} selectedMonth={activityMonth} selectedYear={activityYear} />
                </div>
              </LazyFeature>
            </section>
          )}

          {activeTab === 'subs' && (
            <section className="feature-page">
              <LazyFeature featureName="Langganan" resetKey={activeTab}>
                <SubscriptionManager subscriptions={subscriptions} onSubscriptionsChange={setSubscriptions} onAddTransaction={addTransaction} onAddReconciledTransactions={addReconciledTransactions} />
              </LazyFeature>
            </section>
          )}

          {activeTab === 'more' && (
            <MoreMenu
              transactions={transactions}
              subscriptions={subscriptions}
              categories={categories}
              onCategoriesChange={setCategories}
              onRestore={restore}
              openCategoryAdd={openCategoryAdd}
              onCloseCategoryAdd={() => setOpenCategoryAdd(false)}
            />
          )}
        </main>
      </div>

      <p className="sr-only" role="status" aria-live="polite">Bagian aktif: {activeTab === 'home' ? 'Home' : activeTab === 'activity' ? 'Aktivitas' : activeTab === 'subs' ? 'Langganan' : 'Lainnya'}</p>

      {openCategoryAdd && activeTab !== 'more' && (
        <div className="category-add-only">
          <CategoryManager categories={categories} onCategoriesChange={setCategories} initialAddOpen onCloseAdd={() => setOpenCategoryAdd(false)} />
        </div>
      )}

      {entry && (
        <QuickTransactionEntry
          type={entry.type}
          category={entry.category}
          mode={entry.mode}
          transactions={transactions}
          onAddTransaction={addTransaction}
          onClose={() => setEntry(null)}
        />
      )}
    </div>
  );
};

export default Index;
