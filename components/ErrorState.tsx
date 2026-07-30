import { IconAlert, IconRefresh } from './icons';

export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="w-full rounded-2xl border border-error-border bg-error-muted p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-error" />
        <div className="min-w-0">
          <p className="font-ui text-[14px] font-medium text-primary">Something went wrong</p>
          <p className="mt-1 font-ui text-[13px] leading-[19px] text-secondary">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 -ml-2 font-ui text-[13px] font-medium text-error transition-colors duration-150 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
