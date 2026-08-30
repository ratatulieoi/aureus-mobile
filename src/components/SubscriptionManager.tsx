import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bell, CalendarDays, ChevronRight, Clock, GripVertical, Plus, RefreshCcw, Trash2, X } from 'lucide-react';
import DeleteConfirmation from '@/components/DeleteConfirmation';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import type { AppNotification, NewTransaction, Subscription, Transaction } from '@/domain/types';
import { addCalendarDays, calendarDateToLocalInstant, formatLocalCalendarDate, parseLocalCalendarDate } from '@/domain/calendar-date';
import { generateId } from '@/domain/id';
import { countSubscriptionNotifications, notificationItemName } from '@/domain/notification';
import { areSubscriptionListsEqual, reconcileSubscriptions, reorderSubscriptions, SUBSCRIPTION_COLORS, validateAndNormalizeSubscription } from '@/domain/subscription';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';

interface SubscriptionManagerProps {
  subscriptions: Subscription[];
  notifications?: AppNotification[];
  onSubscriptionsChange: React.Dispatch<React.SetStateAction<Subscription[]>>;
  onAddTransaction: (transaction: NewTransaction) => boolean;
  onAddReconciledTransactions: (transactions: Transaction[]) => void;
  onOpenNotifications?: () => void;
  onRemoveNotificationLinks?: (subscriptionId: string) => void;
}

interface NewSubscriptionState {
  name: string;
  amount: string;
  cycleDays: string;
  startDate: string;
  createTransactionNow: boolean;
}

interface SubscriptionCardProps {
  subscription: Subscription;
  notifications: AppNotification[];
  today: string;
  onDelete?: (subscription: Subscription) => void;
  dragHandle?: React.ReactNode;
  overlay?: boolean;
}

type SortableSubscriptionCardProps = Omit<SubscriptionCardProps, 'dragHandle' | 'overlay'>;

const restrictSubscriptionDragToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

const emptyForm = (): NewSubscriptionState => ({
  name: '',
  amount: '',
  cycleDays: '30',
  startDate: formatLocalCalendarDate(new Date()),
  createTransactionNow: true,
});

const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  subscriptions,
  notifications = [],
  onSubscriptionsChange,
  onAddTransaction,
  onAddReconciledTransactions,
  onOpenNotifications,
  onRemoveNotificationLinks,
}) => {
  const today = formatLocalCalendarDate(new Date());
  const [isAdding, setIsAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Subscription | null>(null);
  const [newSub, setNewSub] = useState<NewSubscriptionState>(emptyForm);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const reconciledSignatureRef = useRef<string>('');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useMobileBackDismiss(isAdding && pendingDelete === null, () => setIsAdding(false));

  useEffect(() => {
    const signature = JSON.stringify(subscriptions.map(({ id, nextPaymentDate, amount, cycleDays }) => [id, nextPaymentDate, amount, cycleDays]));
    if (signature === reconciledSignatureRef.current) return;
    reconciledSignatureRef.current = signature;

    const result = reconcileSubscriptions(subscriptions, new Date());
    if (result.transactions.length > 0) {
      onAddReconciledTransactions(result.transactions);
      toast({ title: 'Langganan diperpanjang', description: `${result.transactions.length} tagihan jatuh tempo telah dicatat sesuai tanggalnya.` });
    }
    if (!areSubscriptionListsEqual(subscriptions, result.subscriptions)) onSubscriptionsChange(result.subscriptions);
    if (result.blockedSubscriptionIds.length > 0) {
      toast({ variant: 'destructive', title: 'Rekonsiliasi dibatasi', description: `${result.blockedSubscriptionIds.length} langganan terlalu tertinggal dan tidak diubah.` });
    }
  }, [subscriptions, onAddReconciledTransactions, onSubscriptionsChange]);

  const closeAdd = () => {
    setIsAdding(false);
    setNewSub(emptyForm());
  };

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = /^\d+$/.test(newSub.amount.trim()) ? Number(newSub.amount.trim()) : Number.NaN;
    const cycleDays = /^\d+$/.test(newSub.cycleDays) ? Number(newSub.cycleDays) : Number.NaN;
    const nextPaymentDate = addCalendarDays(newSub.startDate, cycleDays);
    let subscriptionId: string;
    try {
      subscriptionId = generateId('sub');
    } catch {
      toast({ variant: 'destructive', title: 'Gagal membuat langganan', description: 'ID aman tidak tersedia. Silakan coba lagi.' });
      return;
    }
    const result = validateAndNormalizeSubscription({
      id: subscriptionId,
      name: newSub.name,
      amount,
      startDate: newSub.startDate,
      cycleDays,
      nextPaymentDate,
      color: SUBSCRIPTION_COLORS[subscriptions.length % SUBSCRIPTION_COLORS.length],
    });
    if (!result.ok) {
      toast({ variant: 'destructive', title: 'Langganan tidak valid', description: result.error });
      return;
    }

    if (newSub.createTransactionNow && result.value.amount > 0) {
      const date = calendarDateToLocalInstant(newSub.startDate, new Date());
      if (!date) {
        toast({ variant: 'destructive', title: 'Tanggal tidak valid', description: 'Pembayaran pertama tidak dapat dicatat.' });
        return;
      }
      const transactionAdded = onAddTransaction({ type: 'expense', amount: result.value.amount, category: 'Langganan', description: `Langganan Baru: ${result.value.name}`, date });
      if (!transactionAdded) {
        toast({ variant: 'destructive', title: 'Langganan belum dibuat', description: 'Pembayaran pertama gagal dicatat. Silakan coba lagi.' });
        return;
      }
    }

    onSubscriptionsChange((current) => [...current, result.value]);
    closeAdd();
    toast({ title: 'Langganan ditambahkan', description: `${result.value.name} akan dilacak mulai sekarang.` });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    onSubscriptionsChange((current) => {
      const reordered = reorderSubscriptions(current, String(active.id), String(over.id));
      return areSubscriptionListsEqual(current, reordered) ? current : reordered;
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    onSubscriptionsChange((current) => current.filter(({ id }) => id !== pendingDelete.id));
    onRemoveNotificationLinks?.(pendingDelete.id);
    setPendingDelete(null);
  };

  const totalMonthlyEstimate = subscriptions.reduce((sum, subscription) => sum + (subscription.amount * 30 / subscription.cycleDays), 0);

  return (
    <section className="utility-screen subscription-screen" aria-labelledby="subscription-title">
      <header className="utility-screen-header subscription-page-header">
        <h2 id="subscription-title">Langganan</h2>
        <button type="button" className="utility-primary-action" onClick={() => setIsAdding(true)}><Plus aria-hidden="true" />Tambah</button>
      </header>

      {subscriptions.length > 0 && (
        <p className="subscription-monthly-estimate">
          Perkiraan per bulan <strong>Rp {Math.round(totalMonthlyEstimate).toLocaleString('id-ID')}</strong>
        </p>
      )}

      <button type="button" className="subscription-notification-link" onClick={onOpenNotifications} disabled={!onOpenNotifications}>
        <span className="subscription-notification-icon"><Bell aria-hidden="true" /></span>
        <strong>Notifikasi</strong>
        <ChevronRight aria-hidden="true" />
      </button>

      {subscriptions.length === 0 ? (
        <div className="subscription-empty">
          <RefreshCcw aria-hidden="true" />
          <strong>Belum ada langganan</strong>
          <button type="button" onClick={() => setIsAdding(true)}><Plus aria-hidden="true" />Tambah langganan</button>
        </div>
      ) : (
        <section className="subscription-list" aria-labelledby="subscription-list-title">
          <div className="utility-section-heading"><h3 id="subscription-list-title">Pembayaran berikutnya</h3></div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictSubscriptionDragToVerticalAxis]}
            onDragStart={({ active }) => setActiveDragId(String(active.id))}
            onDragCancel={() => setActiveDragId(null)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={subscriptions.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
              <div className="subscription-rows">
                {subscriptions.map((subscription) => (
                  <SortableSubscriptionCard
                    key={subscription.id}
                    subscription={subscription}
                    notifications={notifications}
                    today={today}
                    onDelete={setPendingDelete}
                  />
                ))}
              </div>
            </SortableContext>
            {createPortal(
              <DragOverlay
                modifiers={[restrictSubscriptionDragToVerticalAxis]}
                dropAnimation={{ duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' }}
              >
                {activeDragId ? (
                  <SubscriptionCard
                    subscription={subscriptions.find(({ id }) => id === activeDragId) ?? subscriptions[0]}
                    notifications={notifications}
                    today={today}
                    overlay
                  />
                ) : null}
              </DragOverlay>,
              document.body,
            )}
            <p className="sr-only" role="status" aria-live="polite">
              {activeDragId ? `Mengurutkan ${subscriptions.find(({ id }) => id === activeDragId)?.name ?? 'langganan'}` : ''}
            </p>
          </DndContext>
        </section>
      )}

      {isAdding && createPortal(
        <div className="simple-dialog-backdrop subscription-add-backdrop" role="presentation">
          <section className="simple-dialog subscription-add-dialog" role="dialog" aria-modal="true" aria-labelledby="subscription-add-title">
            <header>
              <div><h2 id="subscription-add-title">Tambah langganan</h2></div>
              <div className="dialog-header-actions">
                <label className="dialog-header-date" title="Pilih tanggal mulai">
                  <CalendarDays aria-hidden="true" />
                  <input aria-label="Tanggal mulai" type="date" value={newSub.startDate} onChange={(event) => setNewSub({ ...newSub, startDate: event.target.value })} required />
                </label>
                <button type="button" aria-label="Tutup tambah langganan" onClick={closeAdd}><X aria-hidden="true" /></button>
              </div>
            </header>
            <form onSubmit={handleAdd}>
              <div className="form-field"><label htmlFor="subscription-name">Nama layanan</label><input id="subscription-name" autoFocus maxLength={100} placeholder="Netflix" value={newSub.name} onChange={(event) => setNewSub({ ...newSub, name: event.target.value })} required /></div>
              <div className="form-field"><label htmlFor="subscription-amount">Biaya (Rp)</label><input id="subscription-amount" type="number" min="0" step="1" inputMode="numeric" placeholder="0" value={newSub.amount} onChange={(event) => setNewSub({ ...newSub, amount: event.target.value })} required /></div>
              <div className="subscription-form-row">
                <div className="form-field"><label htmlFor="subscription-cycle">Siklus (hari)</label><input id="subscription-cycle" type="number" min="1" max="36600" step="1" inputMode="numeric" value={newSub.cycleDays} onChange={(event) => setNewSub({ ...newSub, cycleDays: event.target.value })} required /></div>
              </div>
              <div className="subscription-first-payment"><Checkbox id="createNow" aria-label="Catat pembayaran pertama" checked={newSub.createTransactionNow} onCheckedChange={(checked) => setNewSub({ ...newSub, createTransactionNow: checked === true })} /><label htmlFor="createNow"><strong>Catat pembayaran pertama</strong></label></div>
              <button type="submit" className="simple-primary" disabled={!newSub.name.trim() || newSub.amount === ''}>Simpan</button>
            </form>
          </section>
        </div>,
        document.body,
      )}

      <DeleteConfirmation
        open={pendingDelete !== null}
        target={`Langganan "${pendingDelete?.name ?? ''}"`}
        subject="langganan"
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={confirmDelete}
      />
    </section>
  );
};

const SortableSubscriptionCard: React.FC<SortableSubscriptionCardProps> = ({
  subscription,
  notifications,
  today,
  onDelete,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: subscription.id,
    transition: { duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' },
  });

  return (
    <div
      ref={setNodeRef}
      className={`subscription-sortable${isDragging ? ' is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <SubscriptionCard
        subscription={subscription}
        notifications={notifications}
        today={today}
        onDelete={onDelete}
        dragHandle={(
          <button
            type="button"
            className="subscription-drag-handle"
            data-no-page-swipe="true"
            aria-label={`Ubah urutan ${subscription.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden="true" />
          </button>
        )}
      />
    </div>
  );
};

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  notifications,
  today,
  onDelete,
  dragHandle,
  overlay = false,
}) => {
  const current = parseLocalCalendarDate(today);
  const target = parseLocalCalendarDate(subscription.nextPaymentDate);
  const daysLeft = current && target
    ? Math.round((target.getTime() - current.getTime()) / 86_400_000)
    : 0;
  const progress = Math.min(100, Math.max(0, ((subscription.cycleDays - Math.max(0, daysLeft)) / subscription.cycleDays) * 100));
  const start = parseLocalCalendarDate(subscription.startDate);
  const next = parseLocalCalendarDate(subscription.nextPaymentDate);
  const assignedNotifications = notifications.filter(({ subscriptionIds }) => subscriptionIds.includes(subscription.id));
  const reminderCount = countSubscriptionNotifications(notifications, subscription.id);
  const [showReminderTooltips, setShowReminderTooltips] = useState(false);
  const reminderAreaRef = useRef<HTMLSpanElement>(null);
  const reminderTooltipId = useId();

  useEffect(() => {
    if (!showReminderTooltips) return;
    const dismissOnAction = (event: PointerEvent) => {
      if (event.target instanceof Node && reminderAreaRef.current?.contains(event.target)) return;
      setShowReminderTooltips(false);
    };
    const dismissOnKeyboardOrWheel = () => setShowReminderTooltips(false);
    window.addEventListener('pointerdown', dismissOnAction, true);
    window.addEventListener('keydown', dismissOnKeyboardOrWheel, true);
    window.addEventListener('wheel', dismissOnKeyboardOrWheel, true);
    return () => {
      window.removeEventListener('pointerdown', dismissOnAction, true);
      window.removeEventListener('keydown', dismissOnKeyboardOrWheel, true);
      window.removeEventListener('wheel', dismissOnKeyboardOrWheel, true);
    };
  }, [showReminderTooltips]);
  const progressDescription = `${Math.round(progress)} persen siklus telah berlalu. ${daysLeft <= 0 ? 'Jatuh tempo hari ini.' : `${daysLeft} hari lagi.`}`;

  return (
    <article className={`subscription-card${overlay ? ' is-overlay' : ''}${showReminderTooltips ? ' has-reminder-tooltips' : ''}`}>
      <div className="subscription-card-top">
        {dragHandle ?? <span className="subscription-drag-placeholder" aria-hidden="true"><GripVertical /></span>}
        <div className="subscription-card-identity">
          <span className="subscription-start-date" aria-hidden="true"><small>{start?.toLocaleDateString('id-ID', { month: 'short' })}</small><strong>{start?.getDate()}</strong></span>
          <div className="subscription-card-copy">
            <h3>{subscription.name}</h3>
            <div className="subscription-card-meta">
              <span><Clock aria-hidden="true" />{subscription.cycleDays} hari / siklus</span>
              {reminderCount > 0 && (
                <span ref={reminderAreaRef} className="subscription-reminder-hold">
                  <button
                    type="button"
                    className="subscription-reminder-count"
                    data-no-page-swipe="true"
                    aria-label={`${reminderCount} notifikasi ${subscription.name}. Ketuk untuk melihat.`}
                    aria-expanded={showReminderTooltips}
                    aria-controls={reminderTooltipId}
                    aria-describedby={showReminderTooltips ? reminderTooltipId : undefined}
                    onClick={() => setShowReminderTooltips((visible) => !visible)}
                    disabled={overlay}
                  ><Bell aria-hidden="true" />{reminderCount}</button>
                  {showReminderTooltips && (
                    <span id={reminderTooltipId} className="subscription-reminder-tooltips" role="tooltip">
                      {assignedNotifications.map((notification) => (
                        <span key={notification.id}><strong>{notificationItemName(notification)}</strong><time dateTime={notification.time}>{notification.time}</time></span>
                      ))}
                    </span>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="subscription-card-value">
          <strong>Rp {subscription.amount.toLocaleString('id-ID')}</strong>
          {onDelete ? <button type="button" aria-label={`Hapus langganan ${subscription.name}`} onClick={() => onDelete(subscription)}><Trash2 aria-hidden="true" /></button> : <span className="subscription-delete-placeholder" aria-hidden="true" />}
        </div>
      </div>
      <div className="subscription-card-progress">
        <div><span className={daysLeft <= 3 ? 'is-urgent' : ''}>{daysLeft <= 0 ? 'Jatuh tempo hari ini' : `${daysLeft} hari lagi`}</span><span>{next?.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span></div>
        <div role="progressbar" aria-label={`Siklus ${subscription.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={progressDescription}><span className={daysLeft <= 3 ? 'is-urgent' : ''} style={{ width: `${progress}%` }} /></div>
      </div>
    </article>
  );
};

export default SubscriptionManager;
