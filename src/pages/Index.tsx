import { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Mic, Calendar, DollarSign, Euro, JapaneseYen, PoundSterling, Bitcoin, Coins } from 'lucide-react';
import Header from '@/components/Header';
import BottomNav, { NavTab } from '@/components/BottomNav';
import TransactionForm from '@/components/TransactionForm';
import TransactionSummary from '@/components/TransactionSummary';
import SmartInsights from '@/components/SmartInsights';
import LazyFeature from '@/components/LazyFeature';
import type { NewTransaction, Subscription, Transaction } from '@/domain/types';
import { addPrevalidatedTransaction, hydrateLedger, mergeTransactionsIdempotently, persistLedger } from '@/domain/ledger';
import { validateNewTransaction } from '@/domain/transaction-validation';

const VoiceInput = lazy(() => import('@/components/VoiceInput'));
const TransactionTable = lazy(() => import('@/components/TransactionTable'));
const TransactionByCategory = lazy(() => import('@/components/TransactionByCategory'));
const StatisticsChart = lazy(() => import('@/components/StatisticsChart'));
const MonthlyReports = lazy(() => import('@/components/MonthlyReports'));
const SubscriptionManager = lazy(() => import('@/components/SubscriptionManager'));
const BackupRestore = lazy(() => import('@/components/BackupRestore'));
const AboutSection = lazy(() => import('@/components/AboutSection'));

const Index = () => {
  const [storage] = useState<Storage | null>(() => {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  });
  const [initial] = useState(() => storage
    ? hydrateLedger(storage)
    : { snapshot: { transactions: [], subscriptions: [] }, source: 'empty' as const, canPersist: false });
  const [transactions, setTransactions] = useState<Transaction[]>(initial.snapshot.transactions);
  const transactionsRef = useRef(transactions);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(initial.snapshot.subscriptions);
  const [canPersist, setCanPersist] = useState(initial.canPersist);
  const [showForm, setShowForm] = useState(false);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isAllTime, setIsAllTime] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];

  useEffect(() => {
    if (!canPersist || !storage) return;
    try {
      // One effect owns all financial persistence. The v3 snapshot is the
      // authoritative first write; legacy mirrors follow only after success.
      persistLedger(storage, { transactions, subscriptions });
    } catch (error) {
      console.error('Gagal menyimpan ledger', error);
    }
  }, [transactions, subscriptions, canPersist, storage]);

  const addTransaction = useCallback((candidate: NewTransaction) => {
    // Validate synchronously at the action boundary. The updater receives an
    // already valid immutable value and only performs collision-safe insertion.
    let validated: NewTransaction;
    try {
      validated = validateNewTransaction(candidate);
    } catch (error) {
      console.error('Transaksi ditolak', error);
      return false;
    }
    try {
      const next = addPrevalidatedTransaction(transactionsRef.current, validated);
      transactionsRef.current = next;
      setTransactions(next);
      setShowForm(false);
      setShowVoiceInput(false);
      return true;
    } catch (error) {
      console.error('Transaksi gagal disimpan', error);
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

  const handleRestore = (snapshot: { transactions: Transaction[]; subscriptions: Subscription[] }) => {
    // Validation has completed before this boundary; both domains are replaced
    // in one React batch and the combined snapshot is persisted by the effect.
    setCanPersist(true);
    transactionsRef.current = snapshot.transactions;
    setTransactions(snapshot.transactions);
    setSubscriptions(snapshot.subscriptions);
  };

  const availableYears = Array.from(
    new Set(transactions.map((transaction) => new Date(transaction.date).getFullYear())),
  ).sort((a, b) => b - a);
  if (availableYears.length === 0) availableYears.push(new Date().getFullYear());

  return (
    <div className="min-h-screen bg-background transition-colors duration-300 relative overflow-hidden font-sans selection:bg-primary selection:text-primary-foreground">
      <div aria-hidden="true" className="absolute inset-0 z-0 h-full w-full overflow-hidden pointer-events-none">
        {[
          { Icon: DollarSign, top: '2%', delay: '0s', duration: '40s' },
          { Icon: Bitcoin, top: '5%', delay: '12s', duration: '50s' },
          { Icon: Euro, top: '8%', delay: '25s', duration: '45s' },
          { Icon: JapaneseYen, top: '12%', delay: '5s', duration: '55s' },
          { Icon: Coins, top: '15%', delay: '18s', duration: '38s' },
          { Icon: PoundSterling, top: '18%', delay: '30s', duration: '48s' },
          { Icon: DollarSign, top: '22%', delay: '8s', duration: '42s' },
          { Icon: Euro, top: '25%', delay: '22s', duration: '52s' },
          { Icon: Bitcoin, top: '28%', delay: '2s', duration: '35s' },
          { Icon: JapaneseYen, top: '32%', delay: '15s', duration: '60s' },
          { Icon: Coins, top: '35%', delay: '35s', duration: '46s' },
          { Icon: PoundSterling, top: '38%', delay: '10s', duration: '50s' },
          { Icon: DollarSign, top: '42%', delay: '20s', duration: '44s' },
          { Icon: Euro, top: '45%', delay: '5s', duration: '58s' },
          { Icon: Bitcoin, top: '48%', delay: '28s', duration: '40s' },
          { Icon: JapaneseYen, top: '52%', delay: '12s', duration: '54s' },
          { Icon: Coins, top: '55%', delay: '32s', duration: '48s' },
          { Icon: PoundSterling, top: '58%', delay: '3s', duration: '36s' },
          { Icon: DollarSign, top: '62%', delay: '18s', duration: '56s' },
          { Icon: Euro, top: '65%', delay: '40s', duration: '42s' },
          { Icon: Bitcoin, top: '68%', delay: '8s', duration: '50s' },
          { Icon: JapaneseYen, top: '72%', delay: '25s', duration: '62s' },
          { Icon: Coins, top: '75%', delay: '15s', duration: '45s' },
          { Icon: PoundSterling, top: '78%', delay: '0s', duration: '55s' },
          { Icon: DollarSign, top: '82%', delay: '10s', duration: '48s' },
          { Icon: Euro, top: '85%', delay: '30s', duration: '38s' },
          { Icon: Bitcoin, top: '88%', delay: '5s', duration: '52s' },
          { Icon: JapaneseYen, top: '92%', delay: '22s', duration: '46s' },
          { Icon: Coins, top: '95%', delay: '38s', duration: '60s' },
          { Icon: PoundSterling, top: '98%', delay: '12s', duration: '40s' },
        ].map((item, index) => (
          <div key={index} className="absolute left-[-10%] opacity-20 dark:opacity-10 text-primary animate-drift" style={{ top: item.top, animationDelay: item.delay, animationDuration: item.duration }}>
            <item.Icon aria-hidden="true" strokeWidth={2.5} className="w-6 h-6 sm:w-10 sm:h-10" />
          </div>
        ))}
      </div>

      <Header />
      <main id="main-content" className="main-safe-offset pb-nav custom-scrollbar relative z-0">
        <div className="container mx-auto space-y-6 px-3 py-6 min-[360px]:px-4 sm:px-6 lg:px-8">
          {activeTab === 'home' && (
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-[minmax(0,1fr)_auto]">
              <Button onClick={() => setShowForm(true)} className="h-12 min-w-0 gap-2 bg-primary text-base text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg">
                <Plus aria-hidden="true" className="h-5 w-5" /> Catat Transaksi
              </Button>
              <Button onClick={() => setShowVoiceInput(true)} variant="outline" aria-label="Catat transaksi dengan suara" className="h-12 min-w-0 gap-2 border-primary/20 bg-card text-base text-foreground shadow-sm hover:bg-accent/50">
                <Mic aria-hidden="true" className="h-5 w-5 text-primary" /> Suara
              </Button>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2"><Calendar aria-hidden="true" className="h-4 w-4 text-primary" /><span className="text-sm font-semibold text-foreground">Periode Statistik</span></div>
                <div className="grid w-full grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)] sm:w-auto" aria-describedby={isAllTime ? 'all-time-period-status' : undefined}>
                  <div className="min-w-0"><Label htmlFor="statistics-month" className="sr-only">Bulan statistik</Label><Select disabled={isAllTime} value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(Number(value))}><SelectTrigger id="statistics-month" className="h-11 w-full min-w-0 text-sm sm:w-[140px]"><SelectValue /></SelectTrigger><SelectContent>{months.map((month, index) => <SelectItem key={month} value={index.toString()}>{month}</SelectItem>)}</SelectContent></Select></div>
                  <div className="min-w-0"><Label htmlFor="statistics-year" className="sr-only">Tahun statistik</Label><Select disabled={isAllTime} value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number(value))}><SelectTrigger id="statistics-year" className="h-11 w-full min-w-0 text-sm sm:w-[100px]"><SelectValue /></SelectTrigger><SelectContent>{availableYears.map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}</SelectContent></Select></div>
                </div>
                {isAllTime && <p id="all-time-period-status" role="status" className="text-xs text-muted-foreground sm:text-right">Mode All-Time aktif. Pilihan bulan dan tahun tidak berlaku.</p>}
              </div>
            </div>
          )}

          <section>
            {activeTab === 'home' && <div className="space-y-6"><TransactionSummary transactions={transactions} isAllTime={isAllTime} setIsAllTime={setIsAllTime} /><SmartInsights transactions={transactions} /></div>}
            {activeTab === 'stats' && (
              <LazyFeature featureName="Statistik" resetKey={activeTab}>
                <div className="space-y-6">
                  <TransactionTable transactions={transactions} onDeleteTransaction={deleteTransaction} selectedMonth={selectedMonth} selectedYear={selectedYear} isAllTime={isAllTime} />
                  <StatisticsChart transactions={transactions} selectedMonth={selectedMonth} selectedYear={selectedYear} isAllTime={isAllTime} />
                  <TransactionByCategory transactions={transactions} onDeleteTransaction={deleteTransaction} selectedMonth={selectedMonth} selectedYear={selectedYear} isAllTime={isAllTime} />
                </div>
              </LazyFeature>
            )}
            {activeTab === 'subs' && (
              <LazyFeature featureName="Langganan" resetKey={activeTab}>
                <SubscriptionManager subscriptions={subscriptions} onSubscriptionsChange={setSubscriptions} onAddTransaction={addTransaction} onAddReconciledTransactions={addReconciledTransactions} />
              </LazyFeature>
            )}
            {activeTab === 'reports' && (
              <LazyFeature featureName="Laporan" resetKey={activeTab}>
                <MonthlyReports transactions={transactions} />
              </LazyFeature>
            )}
            {activeTab === 'more' && (
              <LazyFeature featureName="Backup dan Tentang" resetKey={activeTab}>
                <div className="space-y-6">
                  <div className="rounded-xl border-2 border-destructive/30 bg-destructive/10 p-4 shadow-sm"><p className="text-center text-sm font-medium text-destructive">Kalo mau update backup dulu yaa biar datanya ga ilang 🤗</p></div>
                  <BackupRestore transactions={transactions} subscriptions={subscriptions} onRestore={handleRestore} />
                  <AboutSection />
                </div>
              </LazyFeature>
            )}
          </section>
        </div>
      </main>

      <p className="sr-only" role="status" aria-live="polite">Bagian aktif: {activeTab === 'home' ? 'Beranda' : activeTab === 'stats' ? 'Statistik' : activeTab === 'subs' ? 'Langganan' : activeTab === 'reports' ? 'Laporan' : 'Lainnya'}</p>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      {showForm && <TransactionForm onAddTransaction={addTransaction} onClose={() => setShowForm(false)} />}
      {showVoiceInput && (
        <LazyFeature featureName="Input Suara" resetKey={showVoiceInput}>
          <VoiceInput onAddTransaction={addTransaction} onClose={() => setShowVoiceInput(false)} />
        </LazyFeature>
      )}
    </div>
  );
};

export default Index;
