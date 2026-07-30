import { ThemeToggle } from './ThemeToggle';
import { IconPlus, IconHelp } from './icons';

export interface NavBarProps {
  onNewThread: () => void;
  onOpenHelp: () => void;
}

export function NavBar({ onNewThread, onOpenHelp }: NavBarProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-base px-4 py-3 sm:px-6 lg:px-8">
      <span className="font-ui text-[16px] font-semibold text-primary">Testimonium</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNewThread}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 font-ui text-[13px] font-medium text-on transition-colors duration-150 hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <IconPlus className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">New analysis</span>
        </button>
        <ThemeToggle />
        <button
          type="button"
          onClick={onOpenHelp}
          aria-label="How this works"
          title="How this works"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-overlay text-secondary transition-colors duration-150 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <IconHelp className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
