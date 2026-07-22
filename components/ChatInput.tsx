'use client';

import { useRef } from 'react';

export interface ChatInputProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
}

export function ChatInput({ onSubmit, disabled, value, onChange }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSubmit(trimmed);
      onChange('');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[760px] items-end gap-2 rounded-lg border border-border bg-overlay p-3 transition-shadow duration-[180ms] ease-standard focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-muted)]">
      <textarea
        ref={textareaRef}
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 6 * 22)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask anything about your document…"
        rows={1}
        aria-label="Ask a question about your document"
        className="max-h-[132px] flex-1 resize-none bg-transparent font-ui text-[15px] leading-[22px] text-primary placeholder:text-tertiary placeholder:opacity-45 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !value.trim()}
        aria-label="Send question"
        className="rounded-full bg-accent px-4 py-2 font-ui text-[14px] font-medium text-on transition-colors duration-150 hover:bg-accent-hover disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );
}
