import type { Citation } from '@/lib/rag';

export interface CitationChipProps {
  citation: Citation;
  isActive: boolean;
  isDimmed: boolean;
  onClick: () => void;
}

export function CitationChip({ citation, isActive, isDimmed, onClick }: CitationChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="button"
      aria-label={`Jump to citation ${citation.id}, page ${citation.page}`}
      aria-pressed={isActive}
      className={[
        'inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border font-mono text-[11px] font-medium transition-all duration-150 ease-standard hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        isActive
          ? 'border-accent bg-accent-muted text-primary'
          : 'border-border bg-overlay text-secondary hover:border-accent hover:bg-accent-muted',
        isDimmed && !isActive ? 'opacity-60' : '',
      ].join(' ')}
    >
      {citation.id}
    </button>
  );
}
