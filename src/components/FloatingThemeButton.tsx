import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export const FloatingThemeButton: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-white dark:bg-[#2a2a2a] border border-black/10 dark:border-white/10 shadow-lg hover:shadow-xl dark:shadow-black/30 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 z-50"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'dark' ? (
        <Sun size={20} className="text-yellow-500" />
      ) : (
        <Moon size={20} className="text-slate-700" />
      )}
    </button>
  );
};
