import React from 'react';
import { Home, BarChart, File, Grid, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavTab = 'home' | 'stats' | 'subs' | 'reports' | 'more';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const NAV_ITEMS = [
  { id: 'home' as NavTab, icon: Home, label: 'Beranda' },
  { id: 'stats' as NavTab, icon: BarChart, label: 'Statistik' },
  { id: 'subs' as NavTab, icon: Ticket, label: 'Langganan', shortLabel: 'Langganan' },
  { id: 'reports' as NavTab, icon: File, label: 'Laporan' },
  { id: 'more' as NavTab, icon: Grid, label: 'Lainnya' },
];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => (
  <nav aria-label="Navigasi utama" className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
    <div className="mx-auto grid h-16 w-full max-w-3xl grid-cols-5 px-1 sm:px-2">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            className={cn(
              'relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-0.5 py-1 text-[10px] font-medium leading-none ring-offset-background transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-[360px]:text-[11px] sm:px-2 sm:text-xs',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon aria-hidden="true" className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} strokeWidth={2.25} />
            <span className={cn('block w-full truncate text-center', isActive && 'font-semibold')}>{item.shortLabel ?? item.label}</span>
            {isActive && <span aria-hidden="true" className="absolute bottom-0 h-[3px] w-7 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomNav;
