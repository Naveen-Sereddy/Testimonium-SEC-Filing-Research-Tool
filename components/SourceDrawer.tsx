'use client';

import { useEffect, useRef } from 'react';
import type { Citation } from '@/lib/rag';

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
      className="mt-3 animate-[slideUp_280ms_cubic-bezier(0,0,0.2,1)] rounded-md border-l-2 border-accent bg-overlay p-4"
    >
      <p className="font-ui text-[12px] text-secondary">
        Page {citation.page} · {citation.section}
      </p>
      <p className="mt-2 font-serif text-[14px] leading-[22px] text-[#b0b0b8]">{citation.excerpt}</p>
    </div>
  );
}
