'use client';

import { useState } from 'react';
import type { CitationSide, FilingComparison, FilingChange } from '@/lib/compare';
import { IconCheck, IconCopy, IconFile } from './icons';
import { copyText } from '@/lib/clipboard';
import { citationPageUrl, openCitationInNewTab } from '@/lib/citationLink';

function changeLabel(kind: FilingChange['kind']): string {
  return kind === 'modified' ? 'Modified' : kind === 'added' ? 'Added' : 'Removed';
}

export function ComparisonPanel({
  comparison,
  onClose,
  fileUrlForDocumentId,
}: {
  comparison: FilingComparison;
  onClose: () => void;
  fileUrlForDocumentId?: (documentId: string) => string | null;
}) {
  const [section, setSection] = useState<string>('All sections');
  const sections = ['All sections', ...Array.from(new Set(comparison.changes.map((change) => change.section)))];
  const changes = section === 'All sections' ? comparison.changes : comparison.changes.filter((change) => change.section === section);

  return (
    <section className="scroll-thin max-h-[52vh] overflow-y-auto overscroll-contain scroll-smooth border-b border-border bg-raised px-4 py-5 sm:px-6 lg:px-8" aria-label="Filing comparison">
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">What changed</p>
            <h2 className="mt-1 font-ui text-[18px] font-semibold text-primary">
              {comparison.previous.filingYear ?? 'Previous'} → {comparison.current.filingYear ?? 'Current'}
            </h2>
            <p className="mt-1 font-ui text-[13px] text-secondary">
              {comparison.changes.length} passage changes detected. Expand any row to inspect both cited excerpts.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-full border border-border px-3 font-ui text-[12px] text-secondary hover:border-border-strong hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Close comparison
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter changed sections">
          {sections.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={section === item}
              onClick={() => setSection(item)}
              className={`min-h-[44px] rounded-full border px-3 font-ui text-[12px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                section === item ? 'border-accent bg-accent-muted text-primary' : 'border-border text-secondary hover:text-primary'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {changes.length === 0 ? (
            <p className="rounded-xl border border-border bg-overlay p-4 font-ui text-[13px] text-secondary">No changes in this section.</p>
          ) : (
            changes.map((change) => (
              <details key={change.id} className="rounded-xl border border-border bg-overlay">
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-3 px-4 py-3 font-ui text-[13px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${change.kind === 'added' ? 'bg-success/10 text-success' : change.kind === 'removed' ? 'bg-error/10 text-error' : 'bg-accent-muted text-accent'}`}>
                    {changeLabel(change.kind)}
                  </span>
                  <span className="text-secondary">{change.section}</span>
                  <span className="ml-auto text-tertiary">{change.current?.page ?? change.previous?.page ? `p. ${change.current?.page ?? change.previous?.page}` : ''}</span>
                </summary>
                <div className="grid gap-3 border-t border-border p-4 md:grid-cols-2">
                  {change.previous && <ComparisonEvidence side={change.previous} tone="secondary" sourceUrl={fileUrlForDocumentId?.(change.previous.documentId) ?? null} />}
                  {change.current && <ComparisonEvidence side={change.current} tone="primary" sourceUrl={fileUrlForDocumentId?.(change.current.documentId) ?? null} />}
                </div>
              </details>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function ComparisonEvidence({ side, tone, sourceUrl }: { side: CitationSide; tone: 'primary' | 'secondary'; sourceUrl: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="min-w-0">
      <p className="truncate font-ui text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary" title={side.fileName}>
        {side.filingYear ?? side.fileName} · page {side.page}
      </p>
      <p className={`mt-2 break-words font-serif text-[14px] leading-[22px] ${tone === 'primary' ? 'text-primary' : 'text-secondary'}`}>{side.excerpt}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            void copyText(side.excerpt).then((didCopy) => {
              if (!didCopy) return;
              setCopied(true);
              setTimeout(() => setCopied(false), 2200);
            });
          }}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border px-3 font-ui text-[12px] text-secondary hover:border-accent hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy excerpt'}
        </button>
        {sourceUrl && (
          <a
            href={citationPageUrl(sourceUrl, side.page)}
            target="_blank"
            rel="noopener"
            onClick={(event) => openCitationInNewTab(event, citationPageUrl(sourceUrl, side.page))}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border px-3 font-ui text-[12px] text-accent hover:border-accent hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <IconFile className="h-3.5 w-3.5" />
            Jump to page {side.page}
          </a>
        )}
      </div>
    </div>
  );
}
