import { ThemeToggle } from './ThemeToggle';

export interface NavBarProps {
  onNewThread: () => void;
  onOpenSettings: () => void;
}

export function NavBar({ onNewThread, onOpenSettings }: NavBarProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-base px-8 py-4">
      <span className="font-ui text-[20px] font-bold text-primary">Testimonium</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onNewThread}
          className="rounded-full bg-accent px-4 py-2 font-ui text-[14px] font-medium text-on transition-colors duration-150 hover:bg-accent-hover"
        >
          New Thread
        </button>
        <ThemeToggle />
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="rounded-full border border-border bg-overlay px-3 py-2 font-ui text-[13px] text-secondary transition-colors duration-150 hover:text-primary"
        >
          Settings
        </button>
      </div>
    </header>
  );
}
