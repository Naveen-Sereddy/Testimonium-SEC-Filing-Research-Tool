'use client';

import { useRef, useState } from 'react';

export interface UploadZoneProps {
  status: 'idle' | 'dragover' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
  onFileSelected: (file: File) => void;
  onRetry?: () => void;
}

export function UploadZone({ status, errorMessage, onFileSelected, onRetry }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const borderClass = isDragOver ? 'border-accent bg-accent-muted' : 'border-border';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload PDF by dropping a file here or using the file picker"
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
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed ${borderClass} p-12 text-center transition-colors duration-200`}
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

      {status === 'uploading' && (
        <div className="h-0.5 w-full max-w-xs overflow-hidden rounded-full bg-hover">
          <div className="h-full w-2/3 animate-pulse bg-accent transition-all duration-300" />
        </div>
      )}

      {status === 'success' ? (
        <p className="font-ui text-[15px] text-success">Upload complete.</p>
      ) : status === 'error' ? (
        <p role="alert" className="font-ui text-[14px] text-error">
          Upload failed.{' '}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry?.();
            }}
            className="underline"
          >
            Retry
          </button>
          {errorMessage ? <span className="block text-tertiary">{errorMessage}</span> : null}
        </p>
      ) : (
        <>
          <p className="font-ui text-[15px] leading-[22px] text-secondary">Drop a PDF here, or click to browse</p>
          <p id="upload-help" className="font-ui text-[12px] text-tertiary">
            Supports PDF up to 20MB
          </p>
        </>
      )}
    </div>
  );
}
