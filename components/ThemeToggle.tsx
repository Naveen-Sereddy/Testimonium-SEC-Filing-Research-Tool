'use client';

import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      className="rounded-full border border-border bg-overlay px-3 py-1.5 font-ui text-[13px] text-secondary transition-colors duration-[180ms] ease-standard hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {theme === 'dark' ? 'Dark' : 'Light'}
    </button>
  );
}
