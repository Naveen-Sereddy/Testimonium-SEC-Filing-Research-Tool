'use client';

import { useState } from 'react';
import type { Citation } from '@/lib/rag';
import { IconFile } from './icons';

export interface EvidencePanelProps {
  citation: Citation | null;
  fileName: string | null;
  fileUrl: string | null;
}

// Desktop-only persistent panel: clicking any citation anywhere in the
// conversation updates this instead of (or in addition to, on mobile) the
// inline excerpt. fileUrl is a blob: URL of the actual file the user
// uploaded, kept client-side, so "open page" is real page-anchored
// navigation into their own document, not a placeholder link.
export function EvidencePanel({ citation, fileName, fileUrl }: EvidencePanelProps) {
  const [copied, setCopied] = useState(false);

  return (
    <aside className="hidden w-[360px] shrink-0 flex-col overflow-y-auto border-l border-border bg-raised p-5 lg:flex">
      <p className="mb-4 font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">Source evidence</p>

      {citation ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 font-ui text-[12px] font-medium text-secondary">
            <IconFile className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
            {fileName ? `${fileName} · ` : ''}Page {citation.page} · {citation.section}
          </div>
          <p className="font-serif text-[15px] leading-[24px] text-primary">{citation.excerpt}</p>
          {fileUrl && (
            <a
              href={`${fileUrl}#page=${citation.page}`}
              target="_blank"
              rel="noopener"
              onClick={() => {
                navigator.clipboard.writeText(citation.excerpt);
                setCopied(true);
                setTimeout(() => setCopied(false), 2200);
              }}
              className="inline-flex min-h-[44px] w-fit items-center rounded-lg px-2 -ml-2 font-ui text-[13px] font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {copied ? 'Excerpt copied — press ⌘F on that page to find it' : `Open page ${citation.page} in filing →`}
            </a>
          )}
        </div>
      ) : (
        <p className="font-ui text-[13px] leading-[19px] text-tertiary">
          Click a citation number in an answer to see its exact source here: page, section, and excerpt.
        </p>
      )}
    </aside>
  );
}
