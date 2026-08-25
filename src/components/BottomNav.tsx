import React from 'react';
import { Clock3, Ellipsis, House, Plus, Ticket } from 'lucide-react';

export type NavTab = 'home' | 'activity' | 'subs' | 'more';
export type PrimaryNavTab = NavTab;

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: PrimaryNavTab) => void;
}

const DESTINATIONS: ReadonlyArray<{ tab: PrimaryNavTab; label: string; icon: React.ElementType }> = [
  { tab: 'home', label: 'Home', icon: House },
  { tab: 'activity', label: 'Transaction', icon: Clock3 },
  { tab: 'subs', label: 'Subs', icon: Ticket },
  { tab: 'more', label: 'Others', icon: Ellipsis },
];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => (
  <div className="bottom-nav-positioner">
    <nav className="bottom-nav-liquid dock-glass-surface" aria-label="Navigasi utama">
      {DESTINATIONS.map(({ tab, label, icon: Icon }) => (
        <button
          key={tab}
          type="button"
          className="bottom-nav-destination dock-glass-destination"
          aria-current={activeTab === tab ? 'page' : undefined}
          onClick={() => onTabChange(tab)}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </nav>

    <button type="button" className="bottom-nav-add" aria-label="Tambah transaksi" disabled>
      <Plus aria-hidden="true" />
    </button>
  </div>
);

export default BottomNav;
