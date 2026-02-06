import React from 'react';
import { Home, BarChart, File, Grid, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavTab = 'home' | 'stats' | 'subs' | 'reports' | 'more';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'home' as NavTab, icon: Home, label: 'Beranda' },
    { id: 'stats' as NavTab, icon: BarChart, label: 'Statistik' },
    { id: 'subs' as NavTab, icon: Ticket, label: 'Langganan' },
    { id: 'reports' as NavTab, icon: File, label: 'Laporan' },
    { id: 'more' as NavTab, icon: Grid, label: 'Lainnya' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
      <div className="border-t bg-background">
        <div className="container mx-auto px-2">
          <div className="flex h-16 items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                type="button"
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-w-[72px] flex-col items-center justify-center gap-1 rounded-lg px-4 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive && "text-primary")} strokeWidth={2.25} />
                <span 
                  className={cn("leading-none", isActive && "font-semibold")}
                >
                  {item.label}
                </span>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute -bottom-[1px] h-[3px] w-8 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
