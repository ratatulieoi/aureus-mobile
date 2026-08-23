import React from 'react';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavTab = 'home' | 'activity' | 'subs' | 'more';

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const NAV_ITEMS: ReadonlyArray<{ id: NavTab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'activity', label: 'Aktivitas' },
  { id: 'subs', label: 'Langganan' },
  { id: 'more', label: 'Lainnya' },
];

const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => (
  <header className="app-topbar safe-area-top">
    <div className="app-topbar-inner">
      <span className="app-avatar" aria-hidden="true">
        <UserRound className="h-6 w-6" strokeWidth={1.7} />
      </span>
      <nav className="app-tabs" aria-label="Navigasi utama">
        {NAV_ITEMS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            className={cn('app-tab', activeTab === id && 'is-active')}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  </header>
);

export default Header;
