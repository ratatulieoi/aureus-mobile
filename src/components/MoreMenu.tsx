import React, { lazy, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Info, ListTree, Moon, Palette } from 'lucide-react';
import type { CategoryCatalog, Subscription, Transaction } from '@/domain/types';
import CategoryManager from '@/components/CategoryManager';
import ThemeToggle from '@/components/ThemeToggle';
import LazyFeature from '@/components/LazyFeature';

const MonthlyReports = lazy(() => import('@/components/MonthlyReports'));
const BackupRestore = lazy(() => import('@/components/BackupRestore'));
const AboutSection = lazy(() => import('@/components/AboutSection'));

export type MoreSection = 'menu' | 'reports' | 'categories' | 'backup' | 'appearance' | 'about';

interface MoreMenuProps {
  transactions: Transaction[];
  subscriptions: Subscription[];
  categories: CategoryCatalog;
  onCategoriesChange: (categories: CategoryCatalog) => void;
  onRestore: (snapshot: { transactions: Transaction[]; subscriptions: Subscription[]; categories: CategoryCatalog }) => void;
  initialSection?: MoreSection;
}

const MoreMenu: React.FC<MoreMenuProps> = ({
  transactions,
  subscriptions,
  categories,
  onCategoriesChange,
  onRestore,
  initialSection = 'menu',
}) => {
  const [section, setSection] = useState<MoreSection>(initialSection);

  if (section !== 'menu') {
    return (
      <div className="utility-page">
        <button type="button" className="utility-back" onClick={() => setSection('menu')}><ChevronLeft aria-hidden="true" />Kembali ke Lainnya</button>
        {section === 'reports' && <LazyFeature featureName="Laporan" resetKey={section}><MonthlyReports transactions={transactions} /></LazyFeature>}
        {section === 'categories' && <CategoryManager categories={categories} onCategoriesChange={onCategoriesChange} />}
        {section === 'backup' && <LazyFeature featureName="Backup" resetKey={section}><BackupRestore transactions={transactions} subscriptions={subscriptions} categories={categories} onRestore={onRestore} /></LazyFeature>}
        {section === 'appearance' && <section className="appearance-section"><h2>Tampilan</h2><p>Ganti tema Aureus.</p><ThemeToggle /></section>}
        {section === 'about' && <LazyFeature featureName="Tentang Aureus" resetKey={section}><AboutSection /></LazyFeature>}
      </div>
    );
  }

  const items: ReadonlyArray<{ id: Exclude<MoreSection, 'menu'>; label: string; description: string; icon: React.ElementType }> = [
    { id: 'reports', label: 'Laporan & ekspor', description: 'CSV dan laporan cetak bulanan', icon: Download },
    { id: 'categories', label: 'Kelola kategori', description: 'Tambah atau hapus kategori transaksi', icon: ListTree },
    { id: 'backup', label: 'Backup & pulihkan', description: 'Simpan atau ganti data lokal', icon: Download },
    { id: 'appearance', label: 'Tampilan', description: 'Tema terang atau gelap', icon: Palette },
    { id: 'about', label: 'Tentang Aureus', description: 'Informasi aplikasi', icon: Info },
  ];

  return (
    <section className="more-menu" aria-labelledby="more-title">
      <div className="more-heading"><h1 id="more-title">Lainnya</h1><Moon aria-hidden="true" /></div>
      <div className="more-list">
        {items.map(({ id, label, description, icon: Icon }) => (
          <button key={id} type="button" onClick={() => setSection(id)}>
            <Icon aria-hidden="true" />
            <span><strong>{label}</strong><small>{description}</small></span>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
};

export default MoreMenu;
