'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { IconUpload, IconCheck, IconAlert } from './icons';

export interface UploadZoneProps {
  status: 'idle' | 'dragover' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  onFileSelected: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  onRetry?: () => void;
  onSample?: () => void;
  onExampleQuestion?: (question: string) => void;
  progress?: { stage: 'Uploading' | 'Extracting text' | 'Chunking' | 'Indexing'; completed: number; total: number };
  uploadInputRef?: MutableRefObject<HTMLInputElement | null>;
}

// The two early stages are genuinely fast (parsing and section-detection are
// local, synchronous work) so a short timed label is honest. Embedding is the
// slow, variable-length part (real Gemini API calls, batched per chunk), so
// that stage has no fixed duration: it just stays displayed until the real
// response actually arrives, rather than claiming a fake byte-accurate
// progress percentage for work whose length depends on document size.
const EARLY_STAGES = ['Reading PDF…', 'Finding supported sections…'];
const FINAL_STAGE = 'Indexing…';
const EARLY_STAGE_MS = 700;
const LANDING_SUGGESTIONS = [
  'What are the top risk factors?',
  'Summarize the MD&A section',
  'What are total revenues by year?',
];

export function UploadZone({ status, errorMessage, onFileSelected, onFilesSelected, onRetry, onSample, onExampleQuestion, progress, uploadInputRef }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (status !== 'uploading') {
      setStageIndex(0);
      return;
    }
    if (stageIndex >= EARLY_STAGES.length) return;
    const timer = setTimeout(() => setStageIndex((i) => i + 1), EARLY_STAGE_MS);
    return () => clearTimeout(timer);
  }, [status, stageIndex]);

  const stageLabel = progress
    ? `${progress.stage} · ${progress.completed}/${progress.total}${progress.stage === 'Indexing' ? ' chunks' : progress.stage === 'Uploading' ? ' parts' : ' files'}`
    : stageIndex < EARLY_STAGES.length ? EARLY_STAGES[stageIndex] : FINAL_STAGE;

  const showDragState = isDragOver || status === 'dragover';
  const borderClass = showDragState ? 'border-accent bg-accent-muted' : 'border-border hover:border-border-strong';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop one or two SEC 10-K PDFs here, or click to browse"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files).filter((file) => file.type === 'application/pdf').slice(0, 2);
        if (files.length > 1 && onFilesSelected) onFilesSelected(files);
        else if (files[0]) onFileSelected(files[0]);
      }}
      className={`mx-auto flex w-full max-w-[520px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-14 ${borderClass}`}
    >
      <input
        ref={(node) => {
          inputRef.current = node;
          if (uploadInputRef) uploadInputRef.current = node;
        }}
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        aria-describedby="upload-help"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).filter((file) => file.type === 'application/pdf').slice(0, 2);
          if (files.length > 1 && onFilesSelected) onFilesSelected(files);
          else if (files[0]) onFileSelected(files[0]);
        }}
      />

      {status === 'uploading' ? (
        <>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted">
            <IconUpload className="h-5 w-5 animate-pulse text-accent" />
          </div>
          <p className="font-ui text-[14px] text-secondary" aria-live="polite">
            {stageLabel}
          </p>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-1 w-1 rounded-full bg-accent" style={{ animation: 'dotPulse 1.1s ease-in-out infinite' }} />
            <span
              className="h-1 w-1 rounded-full bg-accent"
              style={{ animation: 'dotPulse 1.1s ease-in-out infinite', animationDelay: '0.15s' }}
            />
            <span
              className="h-1 w-1 rounded-full bg-accent"
              style={{ animation: 'dotPulse 1.1s ease-in-out infinite', animationDelay: '0.3s' }}
            />
          </div>
          {progress && (
            <div className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-hover" aria-hidden="true">
              <div className="h-full rounded-full bg-accent transition-all duration-200" style={{ width: `${Math.max(5, (progress.completed / Math.max(1, progress.total)) * 100)}%` }} />
            </div>
          )}
        </>
      ) : status === 'success' ? (
        <>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted">
            <IconCheck className="h-5 w-5 text-success" />
          </div>
          <p className="font-ui text-[15px] text-success">Upload complete.</p>
          <div className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-hover">
            <div className="h-full w-full rounded-full bg-success transition-all duration-300 ease-out" />
          </div>
        </>
      ) : status === 'error' ? (
        <>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-error-muted">
            <IconAlert className="h-5 w-5 text-error" />
          </div>
          <p role="alert" className="font-ui text-[14px] text-error">
            Upload failed.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry?.();
            }}
            className="min-h-[44px] rounded-full border border-error-border px-3.5 font-ui text-[13px] font-medium text-error transition-colors hover:bg-error-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Try again
          </button>
          {errorMessage ? <span className="font-ui text-[12px] text-tertiary">{errorMessage}</span> : null}
        </>
      ) : (
        <>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-hover">
            <IconUpload className="h-5 w-5 text-secondary" />
          </div>
          <p className="font-ui text-[15px] leading-[22px] text-secondary">Drop one or two SEC 10-K PDFs here, or click to browse</p>
          <p id="upload-help" className="font-ui text-[12px] text-tertiary">
            Compare annual filings year over year · 50MB combined upload limit
          </p>
          {onSample && (
            <button
              type="button"
              onClick={(event) => { event.stopPropagation(); onSample(); }}
              className="min-h-[44px] rounded-full border border-accent px-3.5 font-ui text-[13px] font-medium text-accent transition-colors hover:bg-accent-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Try a sample 10-K
            </button>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-2" aria-label="Example questions">
            {LANDING_SUGGESTIONS.map((question) => (
              <button key={question} type="button" onClick={(event) => { event.stopPropagation(); onExampleQuestion?.(question); }} className="min-h-[40px] rounded-full border border-border bg-overlay px-3 font-ui text-[12px] text-secondary transition-colors hover:border-border-strong hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                {question}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
