'use client';

import { useEffect, useRef, useState } from 'react';
import type { Citation, Confidence } from '@/lib/rag';
import { useStreamingText } from '@/hooks/useStreamingText';
import { MarkdownAnswer } from './MarkdownAnswer';
import { SourceDrawer } from './SourceDrawer';
import { ConfidenceMeter } from './ConfidenceMeter';
import { IconCopy, IconCheck, IconRefresh, IconFile, IconChevronDown } from './icons';

export interface ResponseCardProps {
  answer: string;
  citations: Citation[];
  confidence: Confidence;
  explanation: string;
  timestamp: number;
  onCopy: () => void;
  onRegenerate: () => void;
  onEvidenceSelect?: (citation: Citation) => void;
  fileUrl?: string | null;
  indexedSections?: string[];
  onFollowUp?: (question: string) => void;
}

// Each follow-up is answered as a brand-new, standalone query (the RAG
// pipeline has no conversation history, see lib/chat.ts buildPrompt), so
// every suggestion must be self-contained — no "this"/"the answer above".
// Grounded in the document's own indexed sections, never generic canned text.
function followUpSuggestions(citations: Citation[], indexedSections: string[]): string[] {
  if (citations.length === 0) return [];
  const answerSection = citations[0].section;
  const suggestions = [`Summarize the ${answerSection} section`];
  const otherSections = indexedSections.filter((s) => s !== answerSection);
  for (const section of otherSections.slice(0, 2)) {
    suggestions.push(`What are the key points in the ${section} section?`);
  }
  return suggestions;
}

export function ResponseCard({
  answer,
  citations,
  confidence,
  explanation,
  timestamp,
  onCopy,
  onRegenerate,
  onEvidenceSelect,
  fileUrl,
  indexedSections = [],
  onFollowUp,
}: ResponseCardProps) {
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
  const followUps = followUpSuggestions(citations, indexedSections);

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
            const next = wasJustClosed ? null : id;
            setActiveCitationId(next);
            if (next !== null) {
              const c = citationById.get(next);
              if (c) onEvidenceSelect?.(c);
            }
          }}
        />
      </div>

      {activeCitation && (
        <SourceDrawer
          citation={activeCitation}
          fileUrl={fileUrl}
          onClose={() => {
            justClosedRef.current = { id: activeCitationId!, time: Date.now() };
            setActiveCitationId(null);
          }}
        />
      )}

      {!isStreaming && (
        <details className="group mt-3">
          <summary className="flex min-h-[44px] w-fit cursor-pointer select-none items-center gap-1.5 rounded-lg px-2 -ml-2 font-ui text-[12px] font-medium text-tertiary transition-colors hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
            <IconChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
            Why this answer
          </summary>
          <p className="mt-1.5 max-w-[60ch] font-ui text-[13px] leading-[19px] text-tertiary">{explanation}</p>
        </details>
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

      {!isStreaming && onFollowUp && followUps.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {followUps.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onFollowUp(q)}
              className="min-h-[36px] rounded-full border border-border bg-overlay px-3 font-ui text-[12.5px] text-secondary transition-colors duration-150 hover:border-border-strong hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {q}
            </button>
          ))}
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
