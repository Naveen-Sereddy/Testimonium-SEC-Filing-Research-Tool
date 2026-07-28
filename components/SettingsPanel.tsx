'use client';

import { useEffect } from 'react';
import { IconX } from './icons';

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  citationDepth: 'brief' | 'standard' | 'detailed';
  onCitationDepthChange: (v: 'brief' | 'standard' | 'detailed') => void;
}

export function SettingsPanel({ isOpen, onClose, citationDepth, onCitationDepthChange }: SettingsPanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-20" role="dialog" aria-modal="true" aria-label="Settings">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        style={{ animation: 'fadeInUp 180ms ease-out' }}
      />
      <div
        className="absolute right-0 top-0 h-full w-full max-w-[360px] border-l border-border bg-raised p-6 shadow-[-8px_0_24px_rgba(0,0,0,0.25)]"
        style={{ animation: 'slideIn 260ms cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-ui text-[16px] font-semibold text-primary">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6">
          <p className="mb-2 font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">Citation depth</p>
          <div className="flex gap-2">
            {(['brief', 'standard', 'detailed'] as const).map((depth) => (
              <button
                key={depth}
                type="button"
                onClick={() => onCitationDepthChange(depth)}
                aria-pressed={citationDepth === depth}
                className={`rounded-full border px-3 py-1.5 font-ui text-[13px] capitalize transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  citationDepth === depth ? 'border-accent bg-accent-muted text-primary' : 'border-border text-secondary hover:text-primary'
                }`}
              >
                {depth}
              </button>
            ))}
          </div>
        </div>

        <p className="font-ui text-[12px] leading-[18px] text-tertiary">
          Citation depth controls how many source passages (3 / 5 / 8) are retrieved per question.
        </p>
      </div>
    </div>
  );
}
