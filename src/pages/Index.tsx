import { lazy, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import Header from '@/components/Header';
import BottomNav, { type NavTab, type PrimaryNavTab } from '@/components/BottomNav';
import DashboardHome from '@/components/DashboardHome';
import QuickTransactionEntry from '@/components/QuickTransactionEntry';
import MoreMenu, { type MoreSection } from '@/components/MoreMenu';
import ActivityScreen from '@/components/ActivityScreen';
import LazyFeature from '@/components/LazyFeature';
import { toast } from '@/components/ui/use-toast';
import type { CategoryCatalog, NewTransaction, Subscription, Transaction, TransactionType } from '@/domain/types';
import {
  addPrevalidatedTransaction,
  emptyLedgerSnapshot,
  hydrateLedger,
  mergeTransactionsIdempotently,
  persistLedger,
} from '@/domain/ledger';
import { validateAndNormalizeTransaction, validateNewTransaction } from '@/domain/transaction-validation';
import type { DashboardPeriod } from '@/domain/dashboard-period';

const SubscriptionManager = lazy(() => import('@/components/SubscriptionManager'));

interface EntrySelection {
  type: TransactionType;
  category: string;
  mode: 'normal' | 'voice';
}

const TAB_ORDER: readonly PrimaryNavTab[] = ['home', 'activity', 'subs', 'more'];
const PAGE_SWIPE_THRESHOLD = 64;
const PAGE_SWIPE_SLOPE = 1.25;
const PAGE_SWIPE_DURATION = 260;

interface PageSwipe {
  pointerId: number;
  startX: number;
  startY: number;
  axis: 'pending' | 'horizontal' | 'vertical';
}

interface PageMotion {
  offsetX: number;
  previewTab: PrimaryNavTab | null;
  animate: boolean;
  committing: boolean;
}

const IDLE_PAGE_MOTION: PageMotion = {
  offsetX: 0,
  previewTab: null,
  animate: false,
  committing: false,
};

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
  const [pageEntryDirection, setPageEntryDirection] = useState<'forward' | 'backward' | null>(null);
  const [moreSection, setMoreSection] = useState<MoreSection>('menu');
  const [moreViewKey, setMoreViewKey] = useState(0);
  const [pageMotion, setPageMotion] = useState<PageMotion>(IDLE_PAGE_MOTION);
  const pageSwipeRef = useRef<PageSwipe | null>(null);
  const pageSettleTimerRef = useRef<number | null>(null);
  const pageSettleTargetRef = useRef<PrimaryNavTab | null>(null);
  const pageSettlingRef = useRef(false);
  const suppressPageClickRef = useRef(false);
  const [activeType, setActiveType] = useState<TransactionType>('expense');
  const [period, setPeriod] = useState<DashboardPeriod>({ kind: 'quick', id: 'today' });
  const [entry, setEntry] = useState<EntrySelection | null>(null);
  const [now, setNow] = useState(() => new Date());

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
      toast({ title: 'Transaksi disimpan', description: validated.category });
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

  const updateTransaction = (candidate: Transaction) => {
    const validation = validateAndNormalizeTransaction(candidate, { requireId: true });
    if (!validation.ok || !transactionsRef.current.some(({ id }) => id === candidate.id)) return false;
    const next = transactionsRef.current.map((transaction) => transaction.id === candidate.id ? validation.value : transaction);
    transactionsRef.current = next;
    setTransactions(next);
    return true;
  };

  const restore = (snapshot: { transactions: Transaction[]; subscriptions: Subscription[]; categories: CategoryCatalog }) => {
    setCanPersist(true);
    transactionsRef.current = snapshot.transactions;
    setTransactions(snapshot.transactions);
    setSubscriptions(snapshot.subscriptions);
    setCategories(snapshot.categories);
  };

  const openEntry = (category: string, voice: boolean) => {
    setEntry({ type: activeType, category, mode: voice ? 'voice' : 'normal' });
  };

  const clearPageSettleTimer = useCallback(() => {
    if (pageSettleTimerRef.current !== null) window.clearTimeout(pageSettleTimerRef.current);
    pageSettleTimerRef.current = null;
  }, []);

  const completePageMotion = useCallback(() => {
    if (!pageSettlingRef.current) return;
    pageSettlingRef.current = false;
    clearPageSettleTimer();
    const target = pageSettleTargetRef.current;
    pageSettleTargetRef.current = null;
    setPageEntryDirection(null);
    if (target) setActiveTab(target);
    setPageMotion(IDLE_PAGE_MOTION);
    window.requestAnimationFrame(() => { suppressPageClickRef.current = false; });
  }, [clearPageSettleTimer]);

  const startPageSettle = useCallback((target: PrimaryNavTab | null) => {
    clearPageSettleTimer();
    pageSettlingRef.current = true;
    pageSettleTargetRef.current = target;
    pageSettleTimerRef.current = window.setTimeout(completePageMotion, PAGE_SWIPE_DURATION + 80);
  }, [clearPageSettleTimer, completePageMotion]);

  useEffect(() => () => clearPageSettleTimer(), [clearPageSettleTimer]);

  const changeTab = useCallback((tab: PrimaryNavTab) => {
    clearPageSettleTimer();
    pageSettlingRef.current = false;
    pageSettleTargetRef.current = null;
    pageSwipeRef.current = null;
    setPageMotion(IDLE_PAGE_MOTION);
    const currentIndex = TAB_ORDER.indexOf(activeTab as PrimaryNavTab);
    const nextIndex = TAB_ORDER.indexOf(tab as PrimaryNavTab);
    setPageEntryDirection(
      currentIndex >= 0 && nextIndex >= 0 && currentIndex !== nextIndex
        ? nextIndex > currentIndex ? 'forward' : 'backward'
        : null,
    );
    setActiveTab(tab);
  }, [activeTab, clearPageSettleTimer]);

  const openMore = useCallback((section: MoreSection = 'menu') => {
    setMoreSection(section);
    setMoreViewKey((key) => key + 1);
    changeTab('more');
  }, [changeTab]);

  const changePrimaryTab = useCallback((tab: PrimaryNavTab) => {
    if (tab === 'more') {
      openMore('menu');
      return;
    }
    changeTab(tab);
  }, [changeTab, openMore]);

  const startPageSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' || event.button !== 0 || pageSettlingRef.current) return;
    if (TAB_ORDER.indexOf(activeTab as PrimaryNavTab) < 0) return;
    pageSwipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      axis: 'pending',
    };
  };

  const movePageSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    const swipe = pageSwipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId || swipe.axis === 'vertical') return;
    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    if (swipe.axis === 'pending') {
      if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) {
        swipe.axis = 'vertical';
        return;
      }
      if (Math.abs(deltaX) <= 12 || Math.abs(deltaX) <= Math.abs(deltaY) * PAGE_SWIPE_SLOPE) return;
      swipe.axis = 'horizontal';
    }

    event.preventDefault();
    const width = Math.max(1, event.currentTarget.clientWidth);
    const currentIndex = TAB_ORDER.indexOf(activeTab as PrimaryNavTab);
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    const previewTab = TAB_ORDER[nextIndex] ?? null;
    const boundedOffset = Math.max(-width, Math.min(width, deltaX));
    setPageMotion({
      offsetX: previewTab ? boundedOffset : boundedOffset * .18,
      previewTab,
      animate: false,
      committing: false,
    });
  };

  const cancelPageSwipe = () => {
    pageSwipeRef.current = null;
    if (pageMotion.offsetX === 0) {
      setPageMotion(IDLE_PAGE_MOTION);
      return;
    }
    setPageMotion((current) => ({ ...current, offsetX: 0, animate: true, committing: false }));
    startPageSettle(null);
  };

  const finishPageSwipe = (event: ReactPointerEvent<HTMLElement>) => {
    const swipe = pageSwipeRef.current;
    pageSwipeRef.current = null;
    if (!swipe || swipe.pointerId !== event.pointerId || swipe.axis === 'vertical') return;
    const deltaX = event.clientX - swipe.startX;
    const deltaY = event.clientY - swipe.startY;
    const width = Math.max(1, event.currentTarget.clientWidth);
    const threshold = Math.max(PAGE_SWIPE_THRESHOLD, Math.min(96, width * .17));
    const currentIndex = TAB_ORDER.indexOf(activeTab as PrimaryNavTab);
    const nextIndex = deltaX < 0 ? currentIndex + 1 : currentIndex - 1;
    const nextTab = TAB_ORDER[nextIndex] ?? null;
    const deliberate = Math.abs(deltaX) >= threshold && Math.abs(deltaX) > Math.abs(deltaY) * PAGE_SWIPE_SLOPE;

    if (!deliberate || !nextTab) {
      if (pageMotion.offsetX !== 0) {
        setPageMotion((current) => ({ ...current, offsetX: 0, animate: true, committing: false }));
        startPageSettle(null);
      } else {
        setPageMotion(IDLE_PAGE_MOTION);
      }
      return;
    }

    event.preventDefault();
    suppressPageClickRef.current = true;
    setPageMotion({
      offsetX: deltaX < 0 ? -width : width,
      previewTab: nextTab,
      animate: true,
      committing: true,
    });
    startPageSettle(nextTab);
  };

  const renderPage = (tab: NavTab) => {
    if (tab === 'home') return (
      <DashboardHome
        transactions={transactions}
        categories={categories}
        activeType={activeType}
        onActiveTypeChange={setActiveType}
        period={period}
        onPeriodChange={setPeriod}
        now={now}
        onOpenEntry={openEntry}
      />
    );
    if (tab === 'activity') return <ActivityScreen transactions={transactions} onUpdateTransaction={updateTransaction} onDeleteTransaction={deleteTransaction} />;
    if (tab === 'subs') return (
      <section className="feature-page">
        <LazyFeature featureName="Langganan" resetKey={tab}>
          <SubscriptionManager subscriptions={subscriptions} onSubscriptionsChange={setSubscriptions} onAddTransaction={addTransaction} onAddReconciledTransactions={addReconciledTransactions} />
        </LazyFeature>
      </section>
    );
    return (
      <MoreMenu
        key={moreViewKey}
        transactions={transactions}
        subscriptions={subscriptions}
        categories={categories}
        onCategoriesChange={setCategories}
        onRestore={restore}
        initialSection={moreSection}
      />
    );
  };

  const activePrimaryIndex = TAB_ORDER.indexOf(activeTab as PrimaryNavTab);
  const visibleTabs: NavTab[] = pageMotion.previewTab && pageMotion.previewTab !== activeTab
    ? [activeTab, pageMotion.previewTab]
    : [activeTab];

  return (
    <div className="app-shell">
      <div className="mobile-frame">
        <Header onOpenMore={() => openMore('menu')} onOpenBackup={() => openMore('backup')} />
        <main
          id="main-content"
          className="app-content"
          onPointerDown={startPageSwipe}
          onPointerMove={movePageSwipe}
          onPointerUp={finishPageSwipe}
          onPointerCancel={cancelPageSwipe}
          onClickCapture={(event) => {
            if (!suppressPageClickRef.current) return;
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <div className="page-swipe-stage">
            {visibleTabs.map((tab) => {
              const isActive = tab === activeTab;
              const tabIndex = TAB_ORDER.indexOf(tab as PrimaryNavTab);
              const side = tabIndex > activePrimaryIndex ? 1 : -1;
              const transform = isActive && pageMotion.previewTab === null && pageMotion.offsetX === 0
                ? undefined
                : isActive
                  ? `translate3d(${pageMotion.offsetX}px, 0, 0)`
                  : `translate3d(calc(${side * 100}% + ${pageMotion.offsetX}px), 0, 0)`;
              return (
                <div
                  key={tab}
                  className={`app-page page-swipe-layer${isActive ? ' is-active' : ' is-preview'}${pageMotion.animate ? ' is-animating' : ''}${isActive && pageEntryDirection ? ` page-enter-${pageEntryDirection}` : ''}`}
                  style={{ transform }}
                  aria-hidden={!isActive}
                  onTransitionEnd={isActive && pageMotion.animate ? (event) => {
                    if (event.currentTarget !== event.target || event.propertyName !== 'transform') return;
                    completePageMotion();
                  } : undefined}
                >
                  {renderPage(tab)}
                </div>
              );
            })}
          </div>
        </main>
        <BottomNav activeTab={activeTab} onTabChange={changePrimaryTab} />
      </div>

      <p className="sr-only" role="status" aria-live="polite">Bagian aktif: {activeTab === 'home' ? 'Home' : activeTab === 'activity' ? 'History' : activeTab === 'subs' ? 'Subs' : 'Lainnya'}</p>

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
