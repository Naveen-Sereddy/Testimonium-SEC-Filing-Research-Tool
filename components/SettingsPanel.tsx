'use client';

import { useEffect } from 'react';
import { IconX } from './icons';
import { useFocusTrap } from '../hooks/useFocusTrap';

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onReplayOnboarding: () => void;
}

export function SettingsPanel({ isOpen, onClose, onReplayOnboarding }: SettingsPanelProps) {
  const panelRef = useFocusTrap<HTMLDivElement>(isOpen);

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
    <div className="fixed inset-0 z-20" role="dialog" aria-modal="true" aria-label="How this works">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        style={{ animation: 'fadeInUp 180ms ease-out' }}
      />
      <div
        ref={panelRef}
        className="absolute right-0 top-0 h-full w-full max-w-[360px] overflow-y-auto border-l border-border bg-raised p-6 shadow-[-8px_0_24px_rgba(0,0,0,0.25)]"
        style={{ animation: 'slideIn 260ms cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-ui text-[16px] font-semibold text-primary">How this works</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-secondary transition-colors hover:bg-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <p className="mb-1.5 font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">Supported documents</p>
            <p className="font-ui text-[13px] leading-[19px] text-primary">
              SEC 10-K filings only. Indexing is limited to MD&amp;A, Risk Factors, and Legal Proceedings, financial tables and other filing types aren&apos;t supported yet.
            </p>
          </div>
          <div>
            <p className="mb-1.5 font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">Confidence</p>
            <p className="font-ui text-[13px] leading-[19px] text-primary">
              High, Medium, or Low reflects how well the retrieved passages match your question, not a fact-check. If the model can&apos;t support an answer from the filing, confidence is always Low with no citations attached, rather than guessing.
            </p>
          </div>
          <div>
            <p className="mb-1.5 font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">Citations</p>
            <p className="font-ui text-[13px] leading-[19px] text-primary">
              Click a numbered citation to see the exact page, section, and excerpt it came from. Evidence depth (in the composer) controls how many source passages are retrieved per question.
            </p>
          </div>
          <button
            type="button"
            onClick={onReplayOnboarding}
            className="mt-1 inline-flex min-h-[44px] items-center self-start rounded-lg px-2 -ml-2 font-ui text-[13px] font-medium text-accent transition-colors hover:text-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Replay the intro →
          </button>
        </div>
      </div>
    </div>
  );
}
