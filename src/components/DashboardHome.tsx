import React, { useMemo, useRef, useState } from 'react';
import { List, Plus } from 'lucide-react';
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
  onAddCategory: () => void;
}

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const;

const HOLD_MS = 550;
const MOVE_TOLERANCE = 12;

const DashboardHome: React.FC<DashboardHomeProps> = ({
  transactions,
  categories,
  activeType,
  onActiveTypeChange,
  period,
  onPeriodChange,
  now,
  onOpenEntry,
  onAddCategory,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [quickPickerOpen, setQuickPickerOpen] = useState(false);
  const [highlightedQuick, setHighlightedQuick] = useState<QuickPeriodId | null>(null);
  const periodHoldRef = useRef<number | null>(null);
  const periodOriginRef = useRef<{ x: number; y: number } | null>(null);
  const periodHeldRef = useRef(false);
  const periodCancelledRef = useRef(false);
  const highlightedQuickRef = useRef<QuickPeriodId | null>(null);

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
    const stats = new Map<string, { amount: number; count: number }>();
    for (const transaction of filtered) {
      if (transaction.type !== activeType || !order.has(transaction.category)) continue;
      const current = stats.get(transaction.category) ?? { amount: 0, count: 0 };
      current.amount += transaction.amount;
      current.count += 1;
      stats.set(transaction.category, current);
    }
    return categories[activeType]
      .map((name) => ({ name, amount: stats.get(name)?.amount ?? 0, count: stats.get(name)?.count ?? 0 }))
      .sort((left, right) => right.count - left.count || (order.get(left.name) ?? 0) - (order.get(right.name) ?? 0));
  }, [activeType, categories, filtered]);

  const visibleCategories = expanded ? rankedCategories : rankedCategories.slice(0, 5);
  const primaryTotal = totals[activeType];
  const secondaryType: TransactionType = activeType === 'expense' ? 'income' : 'expense';
  const secondaryTotal = totals[secondaryType];
  const availableYears = dashboardAvailableYears(transactions, now);
  useMobileBackDismiss(monthPickerOpen, () => setMonthPickerOpen(false));

  const openMonthPicker = () => {
    if (periodHeldRef.current || periodCancelledRef.current) {
      periodCancelledRef.current = false;
      return;
    }
    setPickerYear(period.kind === 'month' ? period.year : now.getFullYear());
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
      const current = period.kind === 'quick' ? period.id : null;
      highlightedQuickRef.current = current;
      setQuickPickerOpen(true);
      setHighlightedQuick(current);
    }, HOLD_MS);
  };

  const handlePeriodPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const origin = periodOriginRef.current;
    if (!origin) return;
    if (!periodHeldRef.current && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > MOVE_TOLERANCE) {
      periodCancelledRef.current = true;
      clearPeriodHold();
      return;
    }
    if (!periodHeldRef.current) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-quick-period]');
    const next = (target?.dataset.quickPeriod as QuickPeriodId | undefined) ?? null;
    highlightedQuickRef.current = next;
    setHighlightedQuick(next);
  };

  const finishPeriodGesture = () => {
    const held = periodHeldRef.current;
    const selected = highlightedQuickRef.current;
    clearPeriodHold();
    if (held) {
      if (selected) onPeriodChange({ kind: 'quick', id: selected });
      setQuickPickerOpen(false);
      highlightedQuickRef.current = null;
      setHighlightedQuick(null);
      window.setTimeout(() => { periodHeldRef.current = false; }, 0);
    }
  };

  const cancelPeriodGesture = () => {
    clearPeriodHold();
    periodHeldRef.current = false;
    setQuickPickerOpen(false);
    highlightedQuickRef.current = null;
    setHighlightedQuick(null);
  };

  return (
    <div className="dashboard-home">
      <section className="dashboard-summary" aria-label="Ringkasan transaksi">
        <div className="dashboard-summary-copy">
          <button
            type="button"
            className="period-trigger"
            aria-haspopup="dialog"
            aria-expanded={monthPickerOpen || quickPickerOpen}
            onClick={openMonthPicker}
            onPointerDown={handlePeriodPointerDown}
            onPointerMove={handlePeriodPointerMove}
            onPointerUp={finishPeriodGesture}
            onPointerCancel={cancelPeriodGesture}
          >
            <List aria-hidden="true" className="h-4 w-4" />
            {dashboardPeriodLabel(period)}
          </button>
          <p className={cn('dashboard-primary-total', activeType === 'income' && 'is-income')}>
            <span aria-hidden="true">{activeType === 'expense' ? '−' : '+'}</span> Rp{primaryTotal.toLocaleString('id-ID')}
          </p>
          <p className={cn('dashboard-secondary-total', secondaryType === 'income' && 'is-income')}>
            <span aria-hidden="true">{secondaryType === 'expense' ? '−' : '+'}</span> Rp{secondaryTotal.toLocaleString('id-ID')}
          </p>
        </div>
        <button
          type="button"
          className={cn('type-switch', activeType === 'income' && 'is-income')}
          aria-label={activeType === 'expense' ? 'Tampilkan pemasukan' : 'Tampilkan pengeluaran'}
          aria-pressed={activeType === 'income'}
          onClick={() => {
            setExpanded(false);
            onActiveTypeChange(activeType === 'expense' ? 'income' : 'expense');
          }}
        >
          <span aria-hidden="true">{activeType === 'expense' ? '−' : '+'}</span>
        </button>
      </section>

      <section className="dashboard-categories" aria-label={`Kategori ${activeType === 'expense' ? 'pengeluaran' : 'pemasukan'}`}>
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
              {expanded ? 'Tampilkan lebih sedikit' : 'Lihat kategori lainnya'}
            </button>
          )}
        </div>
      </section>

      <section className="dashboard-activity" aria-labelledby="dashboard-activity-title">
        <h2 id="dashboard-activity-title">Aktivitas terkini</h2>
        <div className="activity-placeholder" role="img" aria-label="Aktivitas terkini belum tersedia">
          <svg viewBox="0 0 300 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M5 76 C18 73 20 52 31 59 S45 78 58 58 S75 20 90 31 S101 43 114 42 S127 67 145 69 S169 70 185 68 S194 66 199 64 L203 28 L208 68 C226 68 241 70 255 67 S272 78 284 70 S294 48 298 56 C303 72 309 102 317 142" />
          </svg>
        </div>
      </section>

      <div className="dashboard-tools">
        <input type="text" aria-label="Pencarian" placeholder="Pencarian" disabled />
        <button type="button" aria-label="Tambah kategori" onClick={onAddCategory}><Plus aria-hidden="true" className="h-5 w-5" /></button>
      </div>

      {monthPickerOpen && (
        <div className="picker-backdrop" role="presentation" onPointerDown={() => setMonthPickerOpen(false)}>
          <section className="month-picker" role="dialog" aria-modal="true" aria-label="Pilih bulan" onPointerDown={(event) => event.stopPropagation()}>
            <button type="button" className="year-trigger" aria-expanded={yearPickerOpen} onClick={() => setYearPickerOpen((value) => !value)}>{pickerYear}</button>
            {yearPickerOpen ? (
              <div className="year-list">
                {availableYears.map((year) => <button key={year} type="button" onClick={() => { setPickerYear(year); setYearPickerOpen(false); }}>{year}</button>)}
              </div>
            ) : (
              <div className="month-grid">
                {MONTHS.map((month, index) => (
                  <button
                    key={month}
                    type="button"
                    disabled={!canSelectDashboardMonth(index, pickerYear, now)}
                    onClick={() => { onPeriodChange({ kind: 'month', month: index, year: pickerYear }); setMonthPickerOpen(false); }}
                  >
                    {month}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {quickPickerOpen && (
        <div className="quick-period-picker" role="listbox" aria-label="Pilih periode cepat">
          {QUICK_PERIOD_OPTIONS.map(({ id, label }) => (
            <div
              key={id}
              data-quick-period={id}
              role="option"
              aria-selected={highlightedQuick === id}
              className={highlightedQuick === id ? 'is-highlighted' : undefined}
              onPointerEnter={() => {
                if (!periodHeldRef.current) return;
                highlightedQuickRef.current = id;
                setHighlightedQuick(id);
              }}
              onPointerUp={() => {
                if (!periodHeldRef.current) return;
                onPeriodChange({ kind: 'quick', id });
                periodHeldRef.current = false;
                clearPeriodHold();
                setQuickPickerOpen(false);
                highlightedQuickRef.current = null;
                setHighlightedQuick(null);
              }}
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface CategoryButtonProps {
  category: { name: string; amount: number };
  type: TransactionType;
  onOpenEntry: (category: string, voice: boolean) => void;
}

const CategoryButton: React.FC<CategoryButtonProps> = ({ category, type, onOpenEntry }) => {
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
        }, HOLD_MS);
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
        if (!held.current && !moved.current) onOpenEntry(category.name, false);
      }}
      onPointerCancel={() => { moved.current = true; origin.current = null; clear(); }}
    >
      <span>{category.name}</span>
      <strong className={type === 'income' ? 'is-income' : undefined}>{category.amount > 0 ? `Rp${category.amount.toLocaleString('id-ID')}` : '••••'}</strong>
    </button>
  );
};

export default DashboardHome;
