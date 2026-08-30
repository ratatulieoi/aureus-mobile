import React, { lazy, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  FileChartColumn,
  Info,
  Bell,
  Moon,
  Palette,
  Tags,
  Sun,
} from 'lucide-react';
import type { AppNotification, CategoryCatalog, NotificationPreferences, Subscription, Transaction } from '@/domain/types';
import CategoryManager from '@/components/CategoryManager';
import LazyFeature from '@/components/LazyFeature';
import { useTheme } from '@/hooks/use-theme';

const MonthlyReports = lazy(() => import('@/components/MonthlyReports'));
const BackupRestore = lazy(() => import('@/components/BackupRestore'));
const AboutSection = lazy(() => import('@/components/AboutSection'));
const NotificationManager = lazy(() => import('@/components/NotificationManager'));

export type MoreSection = 'menu' | 'reports' | 'categories' | 'notifications' | 'backup' | 'about';

type DestinationSection = Exclude<MoreSection, 'menu'>;

interface MoreMenuProps {
  transactions: Transaction[];
  subscriptions: Subscription[];
  categories: CategoryCatalog;
  notifications: AppNotification[];
  notificationPreferences: NotificationPreferences;
  onCategoriesChange: (categories: CategoryCatalog) => void;
  onNotificationsChange: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  onNotificationPreferencesChange: React.Dispatch<React.SetStateAction<NotificationPreferences>>;
  onRestore: (snapshot: { transactions: Transaction[]; subscriptions: Subscription[]; categories: CategoryCatalog; notifications: AppNotification[]; notificationPreferences: NotificationPreferences }) => void;
  initialSection?: MoreSection;
}

interface MoreDestination {
  id: DestinationSection;
  label: string;
  description: string;
  icon: React.ElementType;
}

const MoreMenu: React.FC<MoreMenuProps> = ({
  transactions,
  subscriptions,
  categories,
  notifications,
  notificationPreferences,
  onCategoriesChange,
  onNotificationsChange,
  onNotificationPreferencesChange,
  onRestore,
  initialSection = 'menu',
}) => {
  const [section, setSection] = useState<MoreSection>(initialSection);
  const [theme, toggleTheme] = useTheme();

  if (section !== 'menu') {
    return (
      <div className="utility-page">
        <button type="button" className="utility-back" onClick={() => setSection('menu')}>
          <ChevronLeft aria-hidden="true" />
          Kembali ke Others
        </button>
        {section === 'reports' && <LazyFeature featureName="Laporan" resetKey={section}><MonthlyReports transactions={transactions} /></LazyFeature>}
        {section === 'categories' && <CategoryManager categories={categories} onCategoriesChange={onCategoriesChange} />}
        {section === 'notifications' && <LazyFeature featureName="Notifikasi" resetKey={section}><NotificationManager notifications={notifications} preferences={notificationPreferences} subscriptions={subscriptions} onNotificationsChange={onNotificationsChange} onPreferencesChange={onNotificationPreferencesChange} /></LazyFeature>}
        {section === 'backup' && <LazyFeature featureName="Backup" resetKey={section}><BackupRestore transactions={transactions} subscriptions={subscriptions} categories={categories} notifications={notifications} notificationPreferences={notificationPreferences} onRestore={onRestore} /></LazyFeature>}
        {section === 'about' && <LazyFeature featureName="Tentang Aureus" resetKey={section}><AboutSection /></LazyFeature>}
      </div>
    );
  }

  const categoryCount = categories.expense.length + categories.income.length;
  const financeItems: readonly MoreDestination[] = [
    { id: 'reports', label: 'Laporan & ekspor', description: 'Ringkasan bulanan, CSV, dan PDF', icon: FileChartColumn },
    { id: 'categories', label: 'Kelola kategori', description: `${categoryCount} kategori pemasukan dan pengeluaran`, icon: Tags },
  ];
  const dataItems: readonly MoreDestination[] = [
    { id: 'notifications', label: 'Notifikasi', description: `${notifications.length} notifikasi`, icon: Bell },
    { id: 'backup', label: 'Backup & pulihkan', description: 'Transaksi, langganan, kategori, dan jadwal notifikasi', icon: DatabaseBackup },
    { id: 'about', label: 'Tentang Aureus', description: 'Versi aplikasi dan tautan proyek', icon: Info },
  ];

  const renderDestination = ({ id, label, description, icon: Icon }: MoreDestination) => (
    <button key={id} type="button" className="more-row" onClick={() => setSection(id)}>
      <span className="more-row-icon"><Icon aria-hidden="true" /></span>
      <span className="more-row-copy"><strong>{label}</strong><small>{description}</small></span>
      <ChevronRight className="more-row-chevron" aria-hidden="true" />
    </button>
  );

  const ThemeIcon = theme === 'light' ? Sun : Moon;
  const themeName = theme === 'light' ? 'Terang' : 'Gelap';
  const nextThemeName = theme === 'light' ? 'gelap' : 'terang';

  return (
    <section className="more-menu" aria-labelledby="more-title">
      <header className="more-page-header">
        <h1 id="more-title">Others</h1>
        <p>Laporan, kategori, notifikasi, backup, dan pengaturan Aureus.</p>
      </header>

      <div className="more-groups">
        <section className="more-group" aria-labelledby="more-finance-title">
          <h2 id="more-finance-title">Keuangan</h2>
          <div className="more-list">{financeItems.map(renderDestination)}</div>
        </section>

        <section className="more-group" aria-labelledby="more-app-title">
          <h2 id="more-app-title">Data & aplikasi</h2>
          <div className="more-list">
            {dataItems.slice(0, 2).map(renderDestination)}
            <button
              type="button"
              className="more-row more-theme-row"
              aria-label={`Tema aplikasi, ${themeName} aktif. Aktifkan tema ${nextThemeName}`}
              aria-pressed={theme === 'dark'}
              onClick={toggleTheme}
            >
              <span className="more-row-icon"><Palette aria-hidden="true" /></span>
              <span className="more-row-copy"><strong>Tema aplikasi</strong><small>{themeName} aktif</small></span>
              <span className="more-theme-value" aria-hidden="true"><ThemeIcon />{themeName}</span>
            </button>
            {dataItems.slice(2).map(renderDestination)}
          </div>
        </section>
      </div>
    </section>
  );
};

export default MoreMenu;
