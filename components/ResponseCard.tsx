'use client';

import { useEffect, useRef, useState } from 'react';
import type { Citation, Confidence } from '@/lib/rag';
import { splitAnswerOnCitations } from '@/lib/parseCitations';
import { useStreamingText } from '@/hooks/useStreamingText';
import { CitationChip } from './CitationChip';
import { SourceDrawer } from './SourceDrawer';
import { ConfidenceMeter } from './ConfidenceMeter';

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
  const [copied, setCopied] = useState(false);
  const justClosedIdRef = useRef<number | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setActiveCitationId(null), [answer]);

  const segments = splitAnswerOnCitations(displayedText);
  const citationById = new Map(citations.map((c) => [c.id, c]));
  const activeCitation = activeCitationId ? citationById.get(activeCitationId) : undefined;

  const handleCopy = () => {
    navigator.clipboard.writeText(answer.replace(/\[\d+\]/g, '').trim());
    onCopy();
    setCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopied(false), 800);
  };

  return (
    <div className="mx-auto w-full max-w-[760px] rounded-md border border-border bg-raised p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isStreaming && (
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-1 w-1 animate-pulse rounded-full bg-accent" />
              <span className="h-1 w-1 animate-pulse rounded-full bg-accent [animation-delay:100ms]" />
            </span>
          )}
          <span className="font-ui text-[14px] font-medium text-primary">Answer</span>
        </div>
        <ConfidenceMeter confidence={confidence} />
      </div>

      <p aria-live="polite" className="font-serif text-[17px] leading-[28px] text-primary">
        {segments.map((seg, i) =>
          seg.type === 'text' ? (
            <span key={i}>{seg.value}</span>
          ) : citationById.has(seg.id) ? (
            <span key={i} className="mx-0.5 inline-block align-super">
              <CitationChip
                citation={citationById.get(seg.id)!}
                isActive={activeCitationId === seg.id}
                isDimmed={activeCitationId !== null && activeCitationId !== seg.id}
                onClick={() => {
                  const wasJustClosed = justClosedIdRef.current === seg.id;
                  justClosedIdRef.current = null;
                  setActiveCitationId(wasJustClosed ? null : seg.id);
                }}
              />
            </span>
          ) : null,
        )}
      </p>

      {activeCitation && (
        <SourceDrawer
          citation={activeCitation}
          onClose={() => {
            justClosedIdRef.current = activeCitationId;
            setActiveCitationId(null);
          }}
        />
      )}

      {!isStreaming && (
        <div className="mt-4 flex gap-4">
          <button
            type="button"
            onClick={handleCopy}
            className={`font-ui text-[13px] transition-colors duration-150 ${copied ? 'text-success' : 'text-tertiary hover:text-primary'}`}
          >
            {copied ? 'Copied!' : 'Copy answer'}
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            className="font-ui text-[13px] text-tertiary transition-colors duration-150 hover:text-primary"
          >
            Regenerate
          </button>
          <span className="ml-auto font-ui text-[11px] text-tertiary">
            {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
