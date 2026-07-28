const SUGGESTIONS = ['Summarize key findings', 'What are the main policies?', 'Extract action items'];

export interface EmptyStateProps {
  onSuggestionClick: (text: string) => void;
}

export function EmptyState({ onSuggestionClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center sm:py-20">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted">
        <span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true" />
      </div>
      <h2 className="font-ui text-[18px] font-semibold text-primary">What do you want to know?</h2>
      <p className="max-w-[420px] font-ui text-[14px] leading-[22px] text-secondary">
        Ask a question about your document. I&apos;ll find the most relevant passages and answer with citations.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSuggestionClick(s)}
            className="rounded-full border border-border bg-overlay px-3.5 py-1.5 font-ui text-[13px] text-secondary transition-colors duration-150 hover:border-border-strong hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
