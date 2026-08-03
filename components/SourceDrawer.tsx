'use client';

import { useEffect, useRef, useState } from 'react';
import type { Citation } from '@/lib/rag';
import { IconFile } from './icons';

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
        Page {citation.page} · {citation.section}
      </div>
      <p className="mt-2 font-serif text-[14px] leading-[22px] text-secondary">{citation.excerpt}</p>
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
          className="mt-2 inline-flex min-h-[44px] w-fit items-center rounded-lg px-2 -ml-2 font-ui text-[13px] font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copied ? 'Excerpt copied — press ⌘F on that page to find it' : `Open page ${citation.page} in filing →`}
        </a>
      )}
    </div>
  );
}
