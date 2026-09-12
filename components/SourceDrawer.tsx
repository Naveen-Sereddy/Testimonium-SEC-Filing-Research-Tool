'use client';

import { useEffect, useRef, useState } from 'react';
import type { Citation } from '@/lib/rag';
import { IconCheck, IconCopy, IconFile } from './icons';
import { copyText } from '@/lib/clipboard';
import { citationPageUrl, openCitationInNewTab } from '@/lib/citationLink';

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
      {citation.kind === 'table' && citation.table?.rows?.length ? (
        <div className="mt-2 overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-left font-mono text-[12px] leading-5 text-secondary">
            <thead className="bg-hover text-tertiary"><tr><th className="px-2 py-1.5 font-medium">Line item</th>{citation.table.columns.map((column) => <th key={column} className="px-2 py-1.5 text-right font-medium">{column}</th>)}</tr></thead>
            <tbody>{citation.table.rows.map((row) => <tr key={row.label} className="border-t border-border"><th className="px-2 py-1.5 font-medium">{row.label}</th>{row.values.map((value, index) => <td key={`${row.label}-${index}`} className="px-2 py-1.5 text-right">{isHighlighted(value, citation.highlights ?? []) ? <mark className="rounded bg-accent-muted px-0.5 text-primary">{value}</mark> : value}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ) : <HighlightedExcerpt text={citation.excerpt} highlights={citation.highlights ?? []} />}
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
          href={citationPageUrl(fileUrl, citation.page)}
          target="_blank"
          rel="noopener"
          onClick={(event) => openCitationInNewTab(event, citationPageUrl(fileUrl, citation.page))}
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

function HighlightedExcerpt({ text, highlights }: { text: string; highlights: string[] }) {
  const tableLike = /\t|(?:^|\n)\s*(?:years? ended|as of|\(\$\s*in\s+(?:thousands|millions|billions))/im.test(text);
  const className = tableLike
    ? 'mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-base p-3 font-mono text-[11px] leading-5 text-secondary'
    : 'mt-2 break-words font-serif text-[14px] leading-[22px] text-secondary';
  if (highlights.length === 0) return <p className={className}>{text}</p>;
  const matcher = new RegExp(`(${highlights.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  return <p className={className}>{text.split(matcher).map((part, index) => highlights.some((value) => value.toLowerCase() === part.toLowerCase()) ? <mark key={index} className="rounded bg-accent-muted px-0.5 text-primary">{part}</mark> : part)}</p>;
}

function isHighlighted(value: string, highlights: string[]) {
  const normalized = value.replace(/\s/g, '').toLowerCase();
  return highlights.some((highlight) => highlight.replace(/\s/g, '').toLowerCase() === normalized);
}
