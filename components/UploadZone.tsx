'use client';

import { useRef, useState } from 'react';
import { IconUpload, IconCheck, IconAlert } from './icons';

export interface UploadZoneProps {
  status: 'idle' | 'dragover' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  onFileSelected: (file: File) => void;
  onRetry?: () => void;
}

export function UploadZone({ status, errorMessage, onFileSelected, onRetry }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const showDragState = isDragOver || status === 'dragover';
  const borderClass = showDragState ? 'border-accent bg-accent-muted' : 'border-border hover:border-border-strong';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload PDF by dropping file here or using the file picker"
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
        const file = e.dataTransfer.files[0];
        if (file) onFileSelected(file);
      }}
      className={`mx-auto flex w-full max-w-[520px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:p-14 ${borderClass}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        aria-describedby="upload-help"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
        }}
      />

      {status === 'uploading' ? (
        <>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-muted">
            <IconUpload className="h-5 w-5 animate-pulse text-accent" />
          </div>
          <p className="font-ui text-[14px] text-secondary">Processing document…</p>
          <div className="h-1 w-full max-w-[220px] overflow-hidden rounded-full bg-hover">
            <div
              className="h-full rounded-full bg-accent"
              style={{ animation: 'uploadProgress 3.2s cubic-bezier(0.16,1,0.3,1) forwards' }}
            />
          </div>
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
          <p className="font-ui text-[15px] leading-[22px] text-secondary">Drop an SEC 10-K PDF here, or click to browse</p>
          <p id="upload-help" className="font-ui text-[12px] text-tertiary">
            MD&amp;A, Risk Factors &amp; Legal Proceedings sections · up to 4MB
          </p>
        </>
      )}
    </div>
  );
}
