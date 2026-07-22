'use client';

import { useEffect } from 'react';

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
    <div className="fixed inset-0 z-20">
      <button
        type="button"
        aria-label="Close settings"
        onClick={onClose}
        className="absolute inset-0 bg-base/60"
      />
      <div className="absolute right-0 top-0 h-full w-[360px] animate-[slideIn_300ms_ease-out] border-l border-border bg-raised p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-ui text-[16px] font-medium text-primary">Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close settings" className="text-secondary hover:text-primary">
            ✕
          </button>
        </div>

        <div className="mb-6">
          <p className="mb-2 font-ui text-[11px] uppercase tracking-[0.08em] text-secondary">Citation depth</p>
          <div className="flex gap-2">
            {(['brief', 'standard', 'detailed'] as const).map((depth) => (
              <button
                key={depth}
                type="button"
                onClick={() => onCitationDepthChange(depth)}
                className={`rounded-full border px-3 py-1.5 font-ui text-[13px] capitalize transition-colors duration-150 ${
                  citationDepth === depth ? 'border-accent bg-accent-muted text-primary' : 'border-border text-secondary'
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
