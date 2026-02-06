import React from 'react';
import ThemeToggle from './ThemeToggle';
import { Sun } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background safe-area-top">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Sun className="h-6 w-6 text-primary animate-spin-slow" />
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
