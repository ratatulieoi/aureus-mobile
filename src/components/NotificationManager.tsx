import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, ChevronRight, Clock3, Plus, Trash2, X } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { AppNotification, NotificationPreferences, Subscription } from '@/domain/types';
import { generateId } from '@/domain/id';
import { notificationItemLabel, validateAndNormalizeAppNotification } from '@/domain/notification';
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
  daysBefore: string;
  time: string;
}

const newTimingEditor = (): TimingEditor => ({ id: null, daysBefore: '3', time: '08:00' });

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
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AppNotification | null>(null);

  useMobileBackDismiss(editor !== null || assigningId !== null, () => {
    setEditor(null);
    setAssigningId(null);
  });

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
      daysBefore: Number(editor.daysBefore),
      time: editor.time,
      subscriptionIds: existing?.subscriptionIds ?? [],
    }, new Set(subscriptions.map(({ id: subscriptionId }) => subscriptionId)));
    if (!validation.ok) {
      toast({ variant: 'destructive', title: validation.error });
      return;
    }
    const duplicate = notifications.some((notification) => notification.id !== editor.id
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

  const openTimingEditor = (notification: AppNotification) => {
    setAssigningId(null);
    setEditor({ id: notification.id, daysBefore: String(notification.daysBefore), time: notification.time });
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
                <button type="button" onClick={() => openTimingEditor(assigning)}>Ubah waktu</button>
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
              <div><h2 id="notification-editor-title">{editor.id ? 'Ubah waktu' : 'Tambah notifikasi'}</h2></div>
              <button type="button" aria-label="Tutup notifikasi" onClick={() => setEditor(null)}><X aria-hidden="true" /></button>
            </header>
            <form onSubmit={saveTiming}>
              <div className="notification-relative-row">
                <div className="form-field">
                  <label htmlFor="notification-days-before">Hari sebelum</label>
                  <input id="notification-days-before" autoFocus type="number" min="0" max="36600" step="1" inputMode="numeric" value={editor.daysBefore} onChange={(event) => setEditor({ ...editor, daysBefore: event.target.value })} required />
                </div>
                <div className="form-field">
                  <label htmlFor="notification-time">Waktu</label>
                  <input id="notification-time" type="text" inputMode="numeric" pattern="([01][0-9]|2[0-3]):[0-5][0-9]" maxLength={5} placeholder="08:00" value={editor.time} onChange={(event) => setEditor({ ...editor, time: event.target.value })} required />
                </div>
              </div>
              <button type="submit" className="simple-primary">Simpan</button>
            </form>
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
  return `H-${notification.daysBefore}`;
}

function subscriptionReminderMessage(subscriptionName: string, notification: AppNotification): string {
  return notification.daysBefore === 0
    ? `${subscriptionName} akan diingatkan saat jatuh tempo pukul ${notification.time}`
    : `${subscriptionName} akan diingatkan ${notification.daysBefore} hari sebelum pukul ${notification.time}`;
}

export default NotificationManager;
