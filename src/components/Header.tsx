import React from 'react';
import ThemeToggle from './ThemeToggle';
import { Sun } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="safe-area-top fixed inset-x-0 top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun aria-hidden="true" className="h-6 w-6 animate-spin-slow text-primary" />
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">
              <span className="gradient-text">Aureus</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
