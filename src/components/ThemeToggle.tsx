import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

const ThemeToggle = () => {
  const [theme, toggleTheme] = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-11 w-11 hover:bg-muted"
      aria-label={theme === 'light' ? 'Aktifkan tema gelap' : 'Aktifkan tema terang'}
      aria-pressed={theme === 'dark'}
    >
      {theme === 'light' ? <Moon aria-hidden="true" className="h-5 w-5" /> : <Sun aria-hidden="true" className="h-5 w-5" />}
    </Button>
  );
};

export default ThemeToggle;
