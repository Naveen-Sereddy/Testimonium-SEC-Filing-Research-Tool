import { IconFile, IconX } from './icons';

export interface DocumentInfoBarProps {
  fileName: string;
  pageCount: number;
  chunkCount: number;
  onRemove: () => void;
}

export function DocumentInfoBar({ fileName, pageCount, chunkCount, onRemove }: DocumentInfoBarProps) {
  const approxTokens = Math.round((chunkCount * 1000) / 4 / 1000);

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-raised px-4 py-2.5 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2.5">
        <IconFile className="h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
        <p className="truncate font-ui text-[13px] text-secondary">
          <span className="text-primary">{fileName}</span> · {pageCount} pages · ~{approxTokens}K tokens
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${fileName}`}
        title="Remove document"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-tertiary transition-colors duration-150 hover:bg-hover hover:text-error focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );
}
