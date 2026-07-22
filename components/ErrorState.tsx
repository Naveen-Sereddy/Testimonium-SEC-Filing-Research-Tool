export interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="mx-auto w-full max-w-[760px] rounded-md border-l-2 border-error bg-overlay p-4">
      <p className="font-ui text-[14px] font-medium text-primary">Something went wrong</p>
      <p className="mt-1 font-ui text-[13px] text-secondary">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 font-ui text-[13px] text-tertiary transition-colors duration-150 hover:text-accent"
      >
        Try again
      </button>
    </div>
  );
}
