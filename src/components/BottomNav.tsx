import React from 'react';
import BrandMark from '@/components/BrandMark';

export type NavTab = 'home' | 'activity' | 'subs' | 'more';
export type PrimaryNavTab = Exclude<NavTab, 'more'>;

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: PrimaryNavTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => (
  <div className="bottom-nav-positioner">
    <nav className="bottom-nav-liquid" aria-label="Navigasi utama">
      <button
        type="button"
        className="bottom-nav-side bottom-nav-subs"
        aria-current={activeTab === 'subs' ? 'page' : undefined}
        onClick={() => onTabChange('subs')}
      >
        <span>Subs</span>
      </button>

      <button
        type="button"
        className="bottom-nav-home"
        aria-label="Home"
        aria-current={activeTab === 'home' ? 'page' : undefined}
        onClick={() => onTabChange('home')}
      >
        <BrandMark />
      </button>

      <button
        type="button"
        className="bottom-nav-side bottom-nav-history"
        aria-current={activeTab === 'activity' ? 'page' : undefined}
        onClick={() => onTabChange('activity')}
      >
        <span>History</span>
      </button>
    </nav>
  </div>
);

export default BottomNav;
