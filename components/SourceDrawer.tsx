'use client';

import { useEffect, useRef, useState } from 'react';
import type { Citation } from '@/lib/rag';
import { IconCheck, IconCopy, IconFile } from './icons';
import { copyText } from '@/lib/clipboard';

export interface SourceDrawerProps {
  citation: Citation;
  onClose: () => void;
  fileUrl?: string | null;
}

export function SourceDrawer({ citation, onClose, fileUrl }: SourceDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={drawerRef}
      className="mt-3 rounded-xl border border-border bg-overlay p-4"
      style={{ animation: 'slideUp 220ms cubic-bezier(0,0,0.2,1)' }}
    >
      <div className="flex items-center gap-2 font-ui text-[12px] font-medium text-secondary">
        <IconFile className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
        {citation.fileName ? `${citation.fileName} · ` : ''}{citation.filingYear ? `FY ${citation.filingYear} · ` : ''}Page {citation.page} · {citation.section}
      </div>
      {citation.kind === 'table' && citation.table && (
        <p className="mt-2 font-ui text-[11px] text-tertiary">
          {citation.table.title} · columns: {citation.table.columns.join(', ')}{citation.table.unitScale ? ` · ${citation.table.unitScale}` : ''}
        </p>
      )}
      <p className="mt-2 break-words font-serif text-[14px] leading-[22px] text-secondary">{citation.excerpt}</p>
      <div className="mt-2 flex flex-wrap gap-2">
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
        {fileUrl && (
        <a
          href={`${fileUrl}#page=${citation.page}`}
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
  );
}
