import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DatabaseBackup, EllipsisVertical, Moon, PanelsTopLeft, Sun } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { useMobileBackDismiss } from '@/hooks/use-mobile-back-dismiss';
import { useTheme } from '@/hooks/use-theme';

interface HeaderProps {
  onOpenMore: () => void;
  onOpenBackup: () => void;
}

const Header: React.FC<HeaderProps> = ({ onOpenMore, onOpenBackup }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; right: number } | null>(null);
  const [theme, toggleTheme] = useTheme();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLDivElement | null>(null);

  useMobileBackDismiss(menuOpen, () => setMenuOpen(false));

  const updateMenuAnchor = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMenuAnchor({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuAnchor();
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || menuPanelRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    window.addEventListener('pointerdown', dismissOutside);
    window.addEventListener('resize', updateMenuAnchor);
    return () => {
      window.removeEventListener('pointerdown', dismissOutside);
      window.removeEventListener('resize', updateMenuAnchor);
    };
  }, [menuOpen, updateMenuAnchor]);

  const toggleMenu = () => {
    if (!menuOpen) updateMenuAnchor();
    setMenuOpen((open) => !open);
  };

  const runMenuAction = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <header className="app-topbar safe-area-top">
      <div className="app-topbar-inner">
        <div className="app-brand-lockup" aria-label="Aureus">
          <span className="app-brand-mark"><BrandMark /></span>
          <span className="app-wordmark">Aureus</span>
        </div>

        <div className="app-overflow" ref={menuRef}>
          <button
            ref={triggerRef}
            type="button"
            className="app-overflow-trigger"
            aria-label="Buka menu Aureus"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={toggleMenu}
          >
            <EllipsisVertical aria-hidden="true" />
          </button>

          {menuOpen && menuAnchor && createPortal(
            <div
              ref={menuPanelRef}
              className="app-overflow-menu blurred-overlay"
              role="menu"
              aria-label="Menu Aureus"
              style={{ position: 'fixed', top: menuAnchor.top, right: menuAnchor.right }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => runMenuAction(toggleTheme)}
              >
                {theme === 'light' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
                <span><strong>Ganti tema</strong><small>{theme === 'light' ? 'Aktifkan tema gelap' : 'Aktifkan tema terang'}</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(onOpenBackup)}>
                <DatabaseBackup aria-hidden="true" />
                <span><strong>Backup & pulihkan</strong><small>Simpan data lokal</small></span>
              </button>
              <button type="button" role="menuitem" onClick={() => runMenuAction(onOpenMore)}>
                <PanelsTopLeft aria-hidden="true" />
                <span><strong>Others</strong><small>Laporan, kategori, dan info</small></span>
              </button>
            </div>,
            document.body,
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
