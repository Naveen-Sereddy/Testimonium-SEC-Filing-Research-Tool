export interface DocumentInfoBarProps {
  fileName: string;
  pageCount: number;
  chunkCount: number;
  onRemove: () => void;
}

export function DocumentInfoBar({ fileName, pageCount, chunkCount, onRemove }: DocumentInfoBarProps) {
  const approxTokens = Math.round((chunkCount * 1000) / 4 / 1000);

  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-overlay px-4 py-3">
      <p className="font-ui text-[13px] text-secondary">
        {fileName} — {pageCount} pages · ~{approxTokens}K tokens
      </p>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${fileName}`}
        className="font-ui text-[13px] text-tertiary transition-colors duration-150 hover:text-error"
      >
        Remove
      </button>
    </div>
  );
}
