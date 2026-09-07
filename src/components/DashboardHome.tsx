import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BadgeDollarSign,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Gamepad2,
  GraduationCap,
  HeartPulse,
  House,
  MessageCircle,
  ReceiptText,
  RefreshCw,
  Shapes,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UtensilsCrossed,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import type { CategoryCatalog, Transaction, TransactionType } from '@/domain/types';
import {
  canSelectDashboardMonth,
  dashboardAvailableYears,
  dashboardPeriodLabel,
  filterTransactionsForDashboard,
  QUICK_PERIOD_OPTIONS,
  type DashboardPeriod,
  type QuickPeriodId,
} from '@/domain/dashboard-period';
import { cn } from '@/lib/utils';
import { transactionLocalDate } from '@/domain/period';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';

interface DashboardHomeProps {
  transactions: Transaction[];
  categories: CategoryCatalog;
  activeType: TransactionType;
  onActiveTypeChange: (type: TransactionType) => void;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  now: Date;
  onOpenEntry: (category: string, voice: boolean) => void;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

const CATEGORY_HOLD_MS = 550;
const PERIOD_HOLD_MS = 350;
const MOVE_TOLERANCE = 12;

const CATEGORY_ICONS: Readonly<Record<string, LucideIcon>> = {
  'Makanan & Minuman': UtensilsCrossed,
  Transportasi: CarFront,
  Belanja: ShoppingBag,
  Tagihan: ReceiptText,
  Kesehatan: HeartPulse,
  Hiburan: Gamepad2,
  Pendidikan: GraduationCap,
  'Rumah Tangga': House,
  Komunikasi: MessageCircle,
  Langganan: RefreshCw,
  Gaji: WalletCards,
  Bonus: Sparkles,
  Penjualan: BadgeDollarSign,
  Investasi: TrendingUp,
  Freelance: BriefcaseBusiness,
};

const DashboardHome: React.FC<DashboardHomeProps> = ({
  transactions,
  categories,
  activeType,
  onActiveTypeChange,
  period,
  onPeriodChange,
  now,
  onOpenEntry,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [monthPickerTop, setMonthPickerTop] = useState(0);
  const [quickPickerOpen, setQuickPickerOpen] = useState(false);
  const [quickPickerAnchor, setQuickPickerAnchor] = useState<{ left: number; labelCenterY: number } | null>(null);
  const [highlightedQuick, setHighlightedQuick] = useState<QuickPeriodId | null>(null);
  const summaryRef = useRef<HTMLElement | null>(null);
  const periodControlRef = useRef<HTMLDivElement | null>(null);
  const periodLabelRef = useRef<HTMLSpanElement | null>(null);
  const periodHoldRef = useRef<number | null>(null);
  const periodOriginRef = useRef<{ x: number; y: number } | null>(null);
  const periodHeldRef = useRef(false);
  const periodCancelledRef = useRef(false);

  const filtered = useMemo(
    () => filterTransactionsForDashboard(transactions, period, now),
    [transactions, period, now],
  );

  const totals = useMemo(() => ({
    expense: filtered.filter(({ type }) => type === 'expense').reduce((sum, { amount }) => sum + amount, 0),
    income: filtered.filter(({ type }) => type === 'income').reduce((sum, { amount }) => sum + amount, 0),
  }), [filtered]);

  const rankedCategories = useMemo(() => {
    const order = new Map(categories[activeType].map((name, index) => [name, index]));
    const periodStats = new Map<string, { amount: number; count: number }>();
    const lifetimeFrequency = new Map<string, number>();
    for (const transaction of transactions) {
      if (transaction.type !== activeType || !order.has(transaction.category)) continue;
      lifetimeFrequency.set(transaction.category, (lifetimeFrequency.get(transaction.category) ?? 0) + 1);
    }
    for (const transaction of filtered) {
      if (transaction.type !== activeType || !order.has(transaction.category)) continue;
      const current = periodStats.get(transaction.category) ?? { amount: 0, count: 0 };
      current.amount += transaction.amount;
      current.count += 1;
      periodStats.set(transaction.category, current);
    }
    return categories[activeType]
      .map((name) => ({ name, amount: periodStats.get(name)?.amount ?? 0, count: periodStats.get(name)?.count ?? 0 }))
      .sort((left, right) => (lifetimeFrequency.get(right.name) ?? 0) - (lifetimeFrequency.get(left.name) ?? 0)
        || (order.get(left.name) ?? 0) - (order.get(right.name) ?? 0));
  }, [activeType, categories, filtered, transactions]);

  const visibleCategories = expanded ? rankedCategories : rankedCategories.slice(0, 5);
  const primaryTotal = totals[activeType];
  const secondaryType: TransactionType = activeType === 'expense' ? 'income' : 'expense';
  const secondaryTotal = totals[secondaryType];
  const availableYears = useMemo(() => dashboardAvailableYears(transactions, now), [transactions, now]);
  const transactionMonths = useMemo(() => {
    const months = new Set<string>();
    for (const transaction of transactions) {
      const date = transactionLocalDate(transaction);
      if (date) months.add(`${date.getFullYear()}-${date.getMonth()}`);
    }
    return months;
  }, [transactions]);
  useMobileBackDismiss(quickPickerOpen, () => {
    setQuickPickerOpen(false);
    setQuickPickerAnchor(null);
    setHighlightedQuick(null);
  });
  useMobileBackDismiss(monthPickerOpen, () => {
    if (yearPickerOpen) {
      setYearPickerOpen(false);
      return;
    }
    setMonthPickerOpen(false);
  });

  const openMonthPicker = () => {
    if (periodHeldRef.current || periodCancelledRef.current) {
      periodCancelledRef.current = false;
      return;
    }
    if (monthPickerOpen) {
      setYearPickerOpen(false);
      setMonthPickerOpen(false);
      return;
    }
    const summaryBottom = summaryRef.current?.getBoundingClientRect().bottom ?? 0;
    setPickerYear(period.kind === 'month' ? period.year : now.getFullYear());
    setMonthPickerTop(Math.max(16, summaryBottom + 12));
    setYearPickerOpen(false);
    setMonthPickerOpen(true);
  };

  const clearPeriodHold = () => {
    if (periodHoldRef.current !== null) window.clearTimeout(periodHoldRef.current);
    periodHoldRef.current = null;
    periodOriginRef.current = null;
  };

  const handlePeriodPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    periodHeldRef.current = false;
    periodCancelledRef.current = false;
    periodOriginRef.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
    periodHoldRef.current = window.setTimeout(() => {
      periodHeldRef.current = true;
      setYearPickerOpen(false);
      setMonthPickerOpen(false);
      const current = period.kind === 'quick' ? period.id : null;
      const controlRect = periodControlRef.current?.getBoundingClientRect();
      const labelRect = periodLabelRef.current?.getBoundingClientRect();
      if (controlRect && labelRect) {
        setQuickPickerAnchor({
          left: controlRect.left,
          labelCenterY: labelRect.top + labelRect.height / 2,
        });
      }
      setQuickPickerOpen(true);
      setHighlightedQuick(current);
    }, PERIOD_HOLD_MS);
  };

  const quickPeriodAtPoint = (clientX: number, clientY: number): QuickPeriodId | null => {
    const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-quick-period]');
    return (target?.dataset.quickPeriod as QuickPeriodId | undefined) ?? null;
  };

  const handlePeriodPointerMove = (event: React.PointerEvent<Element>) => {
    const origin = periodOriginRef.current;
    if (!origin) return;
    const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
    if (!periodHeldRef.current && distance > MOVE_TOLERANCE) {
      periodCancelledRef.current = true;
      clearPeriodHold();
      return;
    }
    if (!periodHeldRef.current || distance <= MOVE_TOLERANCE) return;
    const next = quickPeriodAtPoint(event.clientX, event.clientY);
    setHighlightedQuick(next);
  };

  const resetQuickPeriodGesture = () => {
    setQuickPickerOpen(false);
    setQuickPickerAnchor(null);
    setHighlightedQuick(null);
  };

  const finishPeriodGesture = (event: React.PointerEvent<Element>) => {
    const held = periodHeldRef.current;
    const origin = periodOriginRef.current;
    const dragged = origin !== null && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > MOVE_TOLERANCE;
    const selected = held && dragged ? quickPeriodAtPoint(event.clientX, event.clientY) : null;
    clearPeriodHold();
    if (!held) return;
    if (selected) onPeriodChange({ kind: 'quick', id: selected });
    resetQuickPeriodGesture();
    window.setTimeout(() => { periodHeldRef.current = false; }, 0);
  };

  const cancelPeriodGesture = () => {
    periodCancelledRef.current = true;
    clearPeriodHold();
    periodHeldRef.current = false;
    resetQuickPeriodGesture();
  };

  return (
    <div className="dashboard-home">
      <section ref={summaryRef} className="dashboard-summary" aria-label="Ringkasan transaksi">
        <div className="dashboard-summary-head">
          <div ref={periodControlRef} className="period-control">
            <button
              type="button"
              className="period-trigger"
              aria-haspopup="dialog"
              aria-expanded={monthPickerOpen || quickPickerOpen}
              onClick={openMonthPicker}
              onContextMenu={(event) => event.preventDefault()}
              onPointerDown={handlePeriodPointerDown}
              onPointerMove={handlePeriodPointerMove}
              onPointerUp={finishPeriodGesture}
              onPointerCancel={cancelPeriodGesture}
            >
              <CalendarDays aria-hidden="true" />
              <span ref={periodLabelRef}>{dashboardPeriodLabel(period)}</span>
              <ChevronDown aria-hidden="true" className="period-trigger-chevron" />
            </button>
          </div>
          <span className="dashboard-summary-kicker">Ringkasan</span>
        </div>

        <div className="dashboard-summary-copy">
          <span className="dashboard-primary-label">
            Total {activeType === 'expense' ? 'pengeluaran' : 'pemasukan'}
          </span>
          <p className={cn('dashboard-primary-total', activeType === 'income' && 'is-income')}>
            <span aria-hidden="true">{activeType === 'expense' ? '−' : '+'}</span>
            <span>Rp{primaryTotal.toLocaleString('id-ID')}</span>
          </p>
          <p className="dashboard-secondary-total">
            <span>Total {secondaryType === 'expense' ? 'pengeluaran' : 'pemasukan'}</span>
            <strong className={secondaryType === 'income' ? 'is-income' : undefined}>
              <span aria-hidden="true">{secondaryType === 'expense' ? '−' : '+'}</span> Rp{secondaryTotal.toLocaleString('id-ID')}
            </strong>
          </p>
        </div>

        <div className="type-switch" role="group" aria-label="Jenis transaksi">
          <button
            type="button"
            aria-label="Tampilkan pengeluaran"
            aria-pressed={activeType === 'expense'}
            onClick={() => {
              setExpanded(false);
              onActiveTypeChange('expense');
            }}
          >
            <span aria-hidden="true">−</span>
            Pengeluaran
          </button>
          <button
            type="button"
            aria-label="Tampilkan pemasukan"
            aria-pressed={activeType === 'income'}
            onClick={() => {
              setExpanded(false);
              onActiveTypeChange('income');
            }}
          >
            <span aria-hidden="true">+</span>
            Pemasukan
          </button>
        </div>
      </section>

      <section className="dashboard-categories" aria-labelledby="dashboard-category-title">
          <div className="dashboard-categories-heading">
            <div>
              <h2 id="dashboard-category-title">Pilih kategori {activeType === 'expense' ? 'pengeluaran' : 'pemasukan'}</h2>
              <p>Ketuk untuk mencatat. Tahan untuk input suara.</p>
            </div>
          </div>
          {rankedCategories.length > 0 ? (
            <div className="category-list">
              {visibleCategories.map((category) => (
                <CategoryButton
                  key={category.name}
                  category={category}
                  type={activeType}
                  onOpenEntry={onOpenEntry}
                />
              ))}
              {rankedCategories.length > 5 && (
                <button type="button" className="category-more" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
                  {expanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
                  <span>{expanded ? 'Tampilkan lebih sedikit' : 'Lihat kategori lainnya'}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="category-empty">
              <Shapes aria-hidden="true" />
              <strong>Belum ada kategori</strong>
              <p>Tambahkan kategori lewat menu Others untuk mulai mencatat.</p>
            </div>
          )}
      </section>

      {quickPickerOpen && quickPickerAnchor && createPortal(
        <div
          className="quick-period-gesture-layer"
          role="presentation"
          onContextMenu={(event) => event.preventDefault()}
          onPointerMove={handlePeriodPointerMove}
          onPointerUp={finishPeriodGesture}
          onPointerCancel={cancelPeriodGesture}
        >
          <div
            className="quick-period-picker blurred-overlay"
            role="listbox"
            aria-label="Pilih periode cepat"
            data-anchor-period="today"
            style={{ left: quickPickerAnchor.left, top: quickPickerAnchor.labelCenterY }}
          >
            {QUICK_PERIOD_OPTIONS.map(({ id, label }) => (
              <div
                key={id}
                data-quick-period={id}
                role="option"
                aria-selected={highlightedQuick === id}
                className={highlightedQuick === id ? 'is-highlighted' : undefined}
              >
                {label}
              </div>
            ))}
          </div>
        </div>,
        document.body,
      )}

      {monthPickerOpen && createPortal(
        <div className="month-picker-backdrop" role="presentation" onClick={() => setMonthPickerOpen(false)}>
          <section
            className="month-picker-box"
            role="dialog"
            aria-modal="true"
            aria-label="Pilih bulan"
            style={{ top: monthPickerTop }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="month-picker-destination blurred-destination month-picker-year"
              data-surface-active="true"
              aria-expanded={yearPickerOpen}
              onClick={() => setYearPickerOpen((value) => !value)}
            >
              <span>{pickerYear}</span>
            </button>

            {yearPickerOpen ? (
              <div className="month-picker-year-options">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    type="button"
                    className="month-picker-destination blurred-destination"
                    data-surface-active={pickerYear === year || undefined}
                    onClick={() => { setPickerYear(year); setYearPickerOpen(false); }}
                  >
                    <span>{year}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="month-picker-grid">
                <p id="month-has-transactions-description" className="sr-only">Memiliki transaksi pada bulan ini.</p>
                {MONTHS.map((month, index) => {
                  const selectable = canSelectDashboardMonth(index, pickerYear, now);
                  const hasTransactions = selectable && transactionMonths.has(`${pickerYear}-${index}`);
                  return (
                    <button
                      key={month}
                      type="button"
                      className="month-picker-destination blurred-destination"
                      data-surface-active={hasTransactions || undefined}
                      data-has-transactions={hasTransactions || undefined}
                      aria-describedby={hasTransactions ? 'month-has-transactions-description' : undefined}
                      disabled={!selectable}
                      onClick={() => { onPeriodChange({ kind: 'month', month: index, year: pickerYear }); setMonthPickerOpen(false); }}
                    >
                      <span>{month}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>,
        document.body,
      )}

    </div>
  );
};

interface CategoryButtonProps {
  category: { name: string; amount: number; count: number };
  type: TransactionType;
  onOpenEntry: (category: string, voice: boolean) => void;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ category, type, onOpenEntry }) => {
  const CategoryIcon = CATEGORY_ICONS[category.name] ?? (type === 'income' ? CircleDollarSign : Shapes);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const moved = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [holding, setHolding] = useState(false);

  const clear = () => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    holdTimer.current = null;
    setHolding(false);
  };

  return (
    <button
      type="button"
      className={cn('category-row', holding && 'is-holding')}
      aria-label={`${category.name}, ${category.amount > 0 ? `Rp${category.amount.toLocaleString('id-ID')}` : 'belum ada transaksi'}. Tekan untuk input normal, tahan untuk input suara.`}
      onPointerDown={(event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        held.current = false;
        moved.current = false;
        origin.current = { x: event.clientX, y: event.clientY };
        setHolding(true);
        event.currentTarget.setPointerCapture(event.pointerId);
        holdTimer.current = window.setTimeout(() => {
          held.current = true;
          clear();
          onOpenEntry(category.name, true);
        }, CATEGORY_HOLD_MS);
      }}
      onPointerMove={(event) => {
        const start = origin.current;
        if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) <= MOVE_TOLERANCE) return;
        moved.current = true;
        clear();
      }}
      onPointerUp={() => {
        clear();
        origin.current = null;
      }}
      onPointerCancel={() => { moved.current = true; origin.current = null; clear(); }}
      onClick={() => {
        const suppressClick = held.current || moved.current;
        held.current = false;
        moved.current = false;
        if (!suppressClick) onOpenEntry(category.name, false);
      }}
    >
      <span className="category-row-icon"><CategoryIcon aria-hidden="true" /></span>
      <span className="category-row-copy">
        <strong>{category.name}</strong>
        <small>{category.count > 0 ? `${category.count} transaksi` : 'Belum ada transaksi'}</small>
      </span>
      <span className={cn('category-row-amount', type === 'income' && 'is-income')}>
        Rp{category.amount.toLocaleString('id-ID')}
      </span>
    </button>
  );
};

export default DashboardHome;
