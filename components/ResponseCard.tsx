'use client';

import { useEffect, useRef, useState } from 'react';
import type { Citation, Confidence } from '@/lib/rag';
import { useStreamingText } from '@/hooks/useStreamingText';
import { MarkdownAnswer } from './MarkdownAnswer';
import { SourceDrawer } from './SourceDrawer';
import { ConfidenceMeter } from './ConfidenceMeter';
import { IconCopy, IconCheck, IconRefresh, IconFile } from './icons';

export interface ResponseCardProps {
  answer: string;
  citations: Citation[];
  confidence: Confidence;
  timestamp: number;
  onCopy: () => void;
  onRegenerate: () => void;
}

export function ResponseCard({ answer, citations, confidence, timestamp, onCopy, onRegenerate }: ResponseCardProps) {
  const { displayedText, isStreaming } = useStreamingText(answer);
  const [activeCitationId, setActiveCitationId] = useState<number | null>(null);
  const [copied, setCopied] = useState<'plain' | 'withCitations' | null>(null);
  const justClosedRef = useRef<{ id: number; time: number } | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setActiveCitationId(null), [answer]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const citationById = new Map(citations.map((c) => [c.id, c]));
  const activeCitation = activeCitationId ? citationById.get(activeCitationId) : undefined;

  const flashCopied = (which: 'plain' | 'withCitations') => {
    setCopied(which);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(null), 1600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(answer.replace(/\[\d+\]/g, '').trim());
    onCopy();
    flashCopied('plain');
  };

  const handleCopyWithCitations = () => {
    const sources = citations
      .map((c) => `[${c.id}] Page ${c.page}, ${c.section} — "${c.excerpt.trim()}"`)
      .join('\n');
    const text = sources ? `${answer.trim()}\n\nSources:\n${sources}` : answer.trim();
    navigator.clipboard.writeText(text);
    onCopy();
    flashCopied('withCitations');
  };

  return (
    <div className="w-full rounded-2xl border border-border bg-raised p-5 shadow-[0_1px_2px_rgba(0,0,0,0.18)] sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
          <span className="font-ui text-[12px] font-medium uppercase tracking-[0.04em] text-tertiary">Answer</span>
          {isStreaming && (
            <span className="flex items-center gap-1 pl-1" aria-hidden="true">
              <span className="h-1 w-1 rounded-full bg-accent" style={{ animation: 'dotPulse 1.1s ease-in-out infinite' }} />
              <span
                className="h-1 w-1 rounded-full bg-accent"
                style={{ animation: 'dotPulse 1.1s ease-in-out infinite', animationDelay: '0.15s' }}
              />
              <span
                className="h-1 w-1 rounded-full bg-accent"
                style={{ animation: 'dotPulse 1.1s ease-in-out infinite', animationDelay: '0.3s' }}
              />
            </span>
          )}
        </div>
        <ConfidenceMeter confidence={confidence} />
      </div>

      <div aria-live="polite">
        <MarkdownAnswer
          text={displayedText}
          citationById={citationById}
          activeCitationId={activeCitationId}
          onCitationClick={(id) => {
            const jc = justClosedRef.current;
            const wasJustClosed = jc !== null && jc.id === id && Date.now() - jc.time < 300;
            justClosedRef.current = null;
            setActiveCitationId(wasJustClosed ? null : id);
          }}
        />
      </div>

      {activeCitation && (
        <SourceDrawer
          citation={activeCitation}
          onClose={() => {
            justClosedRef.current = { id: activeCitationId!, time: Date.now() };
            setActiveCitationId(null);
          }}
        />
      )}

      {!isStreaming && (
        <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
          <button
            type="button"
            onClick={handleCopy}
            title={copied === 'plain' ? 'Copied' : 'Copy answer'}
            aria-label={copied === 'plain' ? 'Copied' : 'Copy answer'}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              copied === 'plain' ? 'text-success' : 'text-tertiary hover:text-primary'
            }`}
          >
            {copied === 'plain' ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
          </button>
          {citations.length > 0 && (
            <button
              type="button"
              onClick={handleCopyWithCitations}
              title={copied === 'withCitations' ? 'Copied' : 'Copy answer with citations'}
              aria-label={copied === 'withCitations' ? 'Copied' : 'Copy answer with citations'}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                copied === 'withCitations' ? 'text-success' : 'text-tertiary hover:text-primary'
              }`}
            >
              {copied === 'withCitations' ? <IconCheck className="h-4 w-4" /> : <IconFile className="h-4 w-4" />}
            </button>
          )}
          <button
            type="button"
            onClick={onRegenerate}
            title="Regenerate response"
            aria-label="Regenerate response"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-tertiary transition-colors duration-150 hover:bg-hover hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <IconRefresh className="h-4 w-4" />
          </button>
          <span className="ml-auto font-ui text-[11px] text-tertiary">
            {new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  );
}

export function PendingResponseCard() {
  return (
    <div className="w-full rounded-2xl border border-border bg-raised p-5 shadow-[0_1px_2px_rgba(0,0,0,0.18)] sm:p-6" aria-live="polite" aria-label="Generating answer">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        <span className="font-ui text-[12px] font-medium uppercase tracking-[0.04em] text-tertiary">Thinking</span>
      </div>
      <div className="mt-4 flex gap-1.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full bg-tertiary" style={{ animation: 'dotPulse 1.1s ease-in-out infinite' }} />
        <span
          className="h-1.5 w-1.5 rounded-full bg-tertiary"
          style={{ animation: 'dotPulse 1.1s ease-in-out infinite', animationDelay: '0.15s' }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-tertiary"
          style={{ animation: 'dotPulse 1.1s ease-in-out infinite', animationDelay: '0.3s' }}
        />
      </div>
    </div>
  );
}
