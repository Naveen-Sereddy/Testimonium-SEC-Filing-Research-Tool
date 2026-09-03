'use client';

import { useEffect, useState } from 'react';
import type { Citation } from '@/lib/rag';
import { IconCheck, IconCopy, IconFile } from './icons';
import { copyText } from '@/lib/clipboard';

export interface EvidencePanelProps {
  citation: Citation | null;
  fileName: string | null;
  fileUrl: string | null;
  fileUrlForCitation?: (citation: Citation) => string | null;
}

// Desktop-only persistent panel: clicking any citation anywhere in the
// conversation updates this instead of (or in addition to, on mobile) the
// inline excerpt. fileUrl is a blob: URL of the actual file the user
// uploaded, kept client-side, so "open page" is real page-anchored
// navigation into their own document, not a placeholder link.
export function EvidencePanel({ citation, fileName, fileUrl, fileUrlForCitation }: EvidencePanelProps) {
  const [copied, setCopied] = useState(false);
  const sourceUrl = citation ? (fileUrlForCitation ? fileUrlForCitation(citation) : fileUrl) : null;

  useEffect(() => setCopied(false), [citation]);

  return (
    <aside className="scroll-thin hidden w-[360px] shrink-0 scroll-smooth flex-col overflow-y-auto overscroll-contain border-l border-border bg-raised p-5 lg:flex">
      <p className="mb-4 font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">Source evidence</p>

      {citation ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 font-ui text-[12px] font-medium text-secondary">
            <IconFile className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {(citation.fileName ?? fileName) ? `${citation.fileName ?? fileName} · ` : ''}Page {citation.page} · {citation.section}
          </div>
          {citation.kind === 'table' && citation.table && (
            <p className="font-ui text-[11px] text-tertiary">
              {citation.table.title} · columns: {citation.table.columns.join(', ')}{citation.table.unitScale ? ` · ${citation.table.unitScale}` : ''}
            </p>
          )}
          <p className="break-words font-serif text-[15px] leading-[24px] text-primary">{citation.excerpt}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void copyText(citation.excerpt).then((didCopy) => {
                  if (!didCopy) return;
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2200);
                });
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border px-3 font-ui text-[12px] font-medium text-secondary hover:border-accent hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copied ? <IconCheck className="h-3.5 w-3.5" /> : <IconCopy className="h-3.5 w-3.5" />}
              {copied ? 'Copied' : 'Copy excerpt'}
            </button>
          {sourceUrl && (
            <a
              href={`${sourceUrl}#page=${citation.page}`}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border px-3 font-ui text-[12px] font-medium text-accent transition-colors hover:border-accent hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <IconFile className="h-3.5 w-3.5" />
              Jump to page {citation.page}
            </a>
          )}
          </div>
        </div>
      ) : (
        <p className="font-ui text-[13px] leading-[19px] text-tertiary">
          Click a citation number in an answer to see its exact source here: page, section, and excerpt.
        </p>
      )}
    </aside>
  );
}
