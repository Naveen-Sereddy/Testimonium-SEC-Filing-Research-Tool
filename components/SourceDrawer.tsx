'use client';

import { useEffect, useRef } from 'react';
import type { Citation } from '@/lib/rag';
import { IconFile } from './icons';

export interface SourceDrawerProps {
  citation: Citation;
  onClose: () => void;
}

export function SourceDrawer({ citation, onClose }: SourceDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

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
    </div>
  );
}
