import { ThemeToggle } from './ThemeToggle';
import { IconPlus, IconSettings } from './icons';

export interface NavBarProps {
  onNewThread: () => void;
  onOpenSettings: () => void;
}

export function NavBar({ onNewThread, onOpenSettings }: NavBarProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-base px-4 py-3 sm:px-6 lg:px-8">
      <span className="font-ui text-[16px] font-semibold text-primary">Testimonium</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNewThread}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 font-ui text-[13px] font-medium text-on transition-colors duration-150 hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <IconPlus className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">New thread</span>
        </button>
        <ThemeToggle />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          title="Settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-overlay text-secondary transition-colors duration-150 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <IconSettings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
