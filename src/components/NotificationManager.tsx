import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, Check, ChevronRight, Clock3, Plus, Trash2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { AppNotification, NotificationPreferences, Subscription } from '@/domain/types';
import { generateId } from '@/domain/id';
import {
  DEFAULT_NOTIFICATION_MESSAGE,
  DEFAULT_NOTIFICATION_TITLE,
  MAX_NOTIFICATION_MESSAGE_LENGTH,
  MAX_NOTIFICATION_TITLE_LENGTH,
  notificationItemLabel,
  notificationItemName,
  validateAndNormalizeAppNotification,
} from '@/domain/notification';
import {
  checkNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from '@/platform/notifications';
import { toast } from '@/components/ui/use-toast';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';
import DeleteConfirmation from '@/components/DeleteConfirmation';

interface NotificationManagerProps {
  notifications: AppNotification[];
  preferences: NotificationPreferences;
  subscriptions: Subscription[];
  onNotificationsChange: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  onPreferencesChange: React.Dispatch<React.SetStateAction<NotificationPreferences>>;
}

interface TimingEditor {
  id: string | null;
  title: string;
  message: string;
  daysBefore: string;
  time: string;
}

const newTimingEditor = (): TimingEditor => ({
  id: null,
  title: DEFAULT_NOTIFICATION_TITLE,
  message: DEFAULT_NOTIFICATION_MESSAGE,
  daysBefore: '3',
  time: '08:00',
});

const NotificationManager: React.FC<NotificationManagerProps> = ({
  notifications,
  preferences,
  subscriptions,
  onNotificationsChange,
  onPreferencesChange,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('unavailable');
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [editor, setEditor] = useState<TimingEditor | null>(null);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [draftTime, setDraftTime] = useState('08:00');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AppNotification | null>(null);

  useMobileBackDismiss((editor !== null || assigningId !== null) && pendingDelete === null, () => {
    setEditor(null);
    setAssigningId(null);
  });
  useMobileBackDismiss(timePickerOpen, () => setTimePickerOpen(false));

  const assigning = notifications.find(({ id }) => id === assigningId) ?? null;

  const refreshPermission = async () => {
    const current = await checkNotificationPermission();
    setPermission(current);
    setPermissionChecked(true);
    return current;
  };

  const setMasterEnabled = async (enabled: boolean) => {
    if (!enabled) {
      onPreferencesChange({ enabled: false });
      return;
    }
    setPermissionBusy(true);
    try {
      let current = await refreshPermission();
      if (current === 'prompt' || current === 'prompt-with-rationale') {
        current = await requestNotificationPermission();
        setPermission(current);
      }
      if (current === 'denied') {
        toast({ variant: 'destructive', title: 'Izin notifikasi ditolak' });
        return;
      }
      onPreferencesChange({ enabled: true });
    } catch (error) {
      console.error('Notification permission failed', error);
      toast({ variant: 'destructive', title: 'Izin notifikasi gagal diperiksa' });
    } finally {
      setPermissionBusy(false);
    }
  };

  const saveTiming = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    let id = editor.id;
    if (!id) {
      try {
        id = generateId('note');
      } catch {
        toast({ variant: 'destructive', title: 'Notifikasi gagal disimpan' });
        return;
      }
    }
    const existing = notifications.find((notification) => notification.id === editor.id);
    const validation = validateAndNormalizeAppNotification({
      id,
      title: editor.title,
      message: editor.message,
      daysBefore: Number(editor.daysBefore),
      time: editor.time,
      subscriptionIds: existing?.subscriptionIds ?? [],
    }, new Set(subscriptions.map(({ id: subscriptionId }) => subscriptionId)));
    if (!validation.ok) {
      toast({ variant: 'destructive', title: validation.error });
      return;
    }
    const duplicate = notifications.some((notification) => notification.id !== editor.id
      && notification.title === validation.value.title
      && notification.message === validation.value.message
      && notification.daysBefore === validation.value.daysBefore
      && notification.time === validation.value.time);
    if (duplicate) {
      toast({ variant: 'destructive', title: 'Notifikasi ini sudah ada' });
      return;
    }
    onNotificationsChange((current) => editor.id
      ? current.map((notification) => notification.id === editor.id ? validation.value : notification)
      : [...current, validation.value]);
    setEditor(null);
    if (!editor.id) setAssigningId(validation.value.id);
  };

  const toggleAssignment = (notification: AppNotification, subscription: Subscription) => {
    const assigned = notification.subscriptionIds.includes(subscription.id);
    onNotificationsChange((current) => current.map((item) => item.id === notification.id
      ? {
        ...item,
        subscriptionIds: assigned
          ? item.subscriptionIds.filter((id) => id !== subscription.id)
          : [...item.subscriptionIds, subscription.id],
      }
      : item));
    toast({
      title: assigned
        ? `Pengingat ${subscription.name} dihapus`
        : subscriptionReminderMessage(subscription.name, notification),
    });
  };

  const openTimePicker = () => {
    if (!editor) return;
    setDraftTime(editor.time);
    setTimePickerOpen(true);
  };

  const openTimingEditor = (notification: AppNotification) => {
    setAssigningId(null);
    setEditor({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      daysBefore: String(notification.daysBefore),
      time: notification.time,
    });
  };

  return (
    <section className="utility-screen notification-screen" aria-labelledby="notification-title">
      <header className="utility-screen-header notification-page-header">
        <h2 id="notification-title">Notifikasi</h2>
        <button type="button" className="utility-primary-action" onClick={() => setEditor(newTimingEditor())}>
          <Plus aria-hidden="true" />Tambah
        </button>
      </header>

      <section className="notification-master" aria-labelledby="notification-master-title">
        <div className="notification-master-copy">
          <span className="notification-master-icon">{preferences.enabled ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}</span>
          <h3 id="notification-master-title">Notifikasi perangkat</h3>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={preferences.enabled}
          aria-label="Notifikasi perangkat"
          className="notification-switch"
          disabled={permissionBusy}
          onClick={() => void setMasterEnabled(!preferences.enabled)}
        ><span /></button>
        {permissionChecked && permission === 'denied' && <p className="notification-permission-status is-denied">Izin ditolak</p>}
      </section>

      {notifications.length === 0 ? (
        <div className="notification-empty">
          <Clock3 aria-hidden="true" />
          <strong>Belum ada notifikasi</strong>
          <button type="button" onClick={() => setEditor(newTimingEditor())}><Plus aria-hidden="true" />Tambah notifikasi</button>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map((notification) => (
            <button key={notification.id} type="button" className="notification-item" onClick={() => setAssigningId(notification.id)}>
              <span className="notification-row-copy">
                <strong>{notificationDayLabel(notification)}</strong>
                <small>{notification.subscriptionIds.length === 0 ? 'Pilih langganan' : `${notification.subscriptionIds.length} langganan`}</small>
              </span>
              <time className="notification-time-pill" dateTime={notification.time}>{notification.time}</time>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {assigning && createPortal(
        <div className="simple-dialog-backdrop notification-editor-backdrop" role="presentation">
          <section className="simple-dialog notification-editor notification-assignment" role="dialog" aria-modal="true" aria-labelledby="notification-assignment-title">
            <header>
              <div className="notification-assignment-heading"><h2 id="notification-assignment-title">{notificationDayLabel(assigning)}</h2><time className="notification-time-pill" dateTime={assigning.time}>{assigning.time}</time></div>
              <button type="button" aria-label="Tutup pilih langganan" onClick={() => setAssigningId(null)}><X aria-hidden="true" /></button>
            </header>
            <div className="notification-assignment-body">
              <h3>Pakai untuk</h3>
              {subscriptions.length === 0 ? (
                <p className="notification-no-subscriptions">Belum ada langganan</p>
              ) : (
                <div className="notification-subscription-list">
                  {subscriptions.map((subscription) => {
                    const checked = assigning.subscriptionIds.includes(subscription.id);
                    return (
                      <label key={subscription.id} className="notification-subscription-option">
                        <Checkbox
                          checked={checked}
                          aria-label={`${subscription.name} untuk ${notificationItemLabel(assigning)}`}
                          onCheckedChange={() => toggleAssignment(assigning, subscription)}
                        />
                        <span><strong>{subscription.name}</strong><small>Rp {subscription.amount.toLocaleString('id-ID')}</small></span>
                      </label>
                    );
                  })}
                </div>
              )}
              <div className="notification-assignment-actions">
                <button type="button" onClick={() => openTimingEditor(assigning)}>Ubah notifikasi</button>
                <button type="button" className="is-destructive" onClick={() => { setAssigningId(null); setPendingDelete(assigning); }}><Trash2 aria-hidden="true" />Hapus</button>
              </div>
            </div>
          </section>
        </div>,
        document.body,
      )}

      {editor && createPortal(
        <div className="simple-dialog-backdrop notification-editor-backdrop" role="presentation">
          <section className="simple-dialog notification-editor notification-timing-editor" role="dialog" aria-modal="true" aria-labelledby="notification-editor-title">
            <header>
              <div><h2 id="notification-editor-title">{editor.id ? 'Ubah notifikasi' : 'Tambah notifikasi'}</h2></div>
              <button type="button" aria-label="Tutup notifikasi" onClick={() => setEditor(null)}><X aria-hidden="true" /></button>
            </header>
            <form onSubmit={saveTiming}>
              <div className="form-field">
                <label htmlFor="notification-custom-title">Judul</label>
                <input id="notification-custom-title" autoFocus maxLength={MAX_NOTIFICATION_TITLE_LENGTH} placeholder="Contoh: Pengingat {name}" value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} required />
              </div>
              <div className="form-field">
                <label htmlFor="notification-message">Pesan</label>
                <textarea id="notification-message" maxLength={MAX_NOTIFICATION_MESSAGE_LENGTH} rows={3} placeholder="Contoh: Siapkan Rp {amount} untuk {name}." value={editor.message} onChange={(event) => setEditor({ ...editor, message: event.target.value })} required />
              </div>
              <p className="notification-template-help"><span>{'{name}'}</span> nama layanan <span>{'{amount}'}</span> biaya <span>{'{due}'}</span> waktu pembayaran</p>
              <div className="notification-relative-row">
                <div className="form-field">
                  <label htmlFor="notification-days-before">Hari lebih awal</label>
                  <input id="notification-days-before" type="number" min="0" max="36600" step="1" inputMode="numeric" value={editor.daysBefore} onChange={(event) => setEditor({ ...editor, daysBefore: event.target.value })} required />
                </div>
                <div className="form-field">
                  <span className="form-field-label" id="notification-time-label">Waktu</span>
                  <button type="button" className="notification-time-button" aria-labelledby="notification-time-label notification-time-value" onClick={openTimePicker}>
                    <Clock3 aria-hidden="true" /><span id="notification-time-value">{editor.time}</span><ChevronRight aria-hidden="true" />
                  </button>
                </div>
              </div>
              <button type="submit" className="simple-primary">Simpan</button>
            </form>
          </section>
        </div>,
        document.body,
      )}

      {editor && timePickerOpen && createPortal(
        <div className="notification-time-picker-backdrop" role="presentation">
          <section className="notification-time-picker" role="dialog" aria-modal="true" aria-labelledby="notification-time-picker-title">
            <header>
              <button type="button" aria-label="Batal pilih waktu" onClick={() => setTimePickerOpen(false)}><X aria-hidden="true" /></button>
              <div><h2 id="notification-time-picker-title">Pilih waktu</h2><p>Format 24 jam</p></div>
              <button type="button" aria-label="Gunakan waktu" onClick={() => { setEditor({ ...editor, time: draftTime }); setTimePickerOpen(false); }}><Check aria-hidden="true" /></button>
            </header>
            <div className="notification-time-selectors" aria-label="Waktu 24 jam">
              <label>
                <span>Jam</span>
                <select aria-label="Jam" value={draftTime.slice(0, 2)} onChange={(event) => setDraftTime(`${event.target.value}:${draftTime.slice(3, 5)}`)}>
                  {Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')).map((hour) => <option key={hour} value={hour}>{hour}</option>)}
                </select>
              </label>
              <span aria-hidden="true">:</span>
              <label>
                <span>Menit</span>
                <select aria-label="Menit" value={draftTime.slice(3, 5)} onChange={(event) => setDraftTime(`${draftTime.slice(0, 2)}:${event.target.value}`)}>
                  {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0')).map((minute) => <option key={minute} value={minute}>{minute}</option>)}
                </select>
              </label>
            </div>
          </section>
        </div>,
        document.body,
      )}

      <DeleteConfirmation
        open={pendingDelete !== null}
        target={`Notifikasi "${pendingDelete ? notificationItemLabel(pendingDelete) : ''}"`}
        subject="notifikasi"
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={() => {
          if (pendingDelete) onNotificationsChange((current) => current.filter(({ id }) => id !== pendingDelete.id));
          setPendingDelete(null);
        }}
      />
    </section>
  );
};

function notificationDayLabel(notification: AppNotification): string {
  return notificationItemName(notification);
}

function subscriptionReminderMessage(subscriptionName: string, notification: AppNotification): string {
  return notification.daysBefore === 0
    ? `${subscriptionName} akan diingatkan pada hari pembayaran, pukul ${notification.time}`
    : `${subscriptionName} akan diingatkan ${notification.daysBefore} hari lebih awal, pukul ${notification.time}`;
}

export default NotificationManager;
