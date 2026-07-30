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
        // Visual size stays 24px, matching the inline-with-prose design (a
        // 44px circle inline in body text would break the reading flow).
        // The tap target is still expanded to the 44px WCAG minimum via an
        // invisible ::before that extends past the visible circle without
        // affecting layout, since it's absolutely positioned.
        'relative inline-flex h-[24px] w-[24px] items-center justify-center rounded-full border font-mono text-[11px] font-medium transition-all duration-150 ease-standard hover:-translate-y-px before:absolute before:inset-[-10px] before:content-[\'\'] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
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
