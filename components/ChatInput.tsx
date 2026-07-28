'use client';

import { useEffect, useRef } from 'react';
import { IconSend, IconSpinner } from './icons';

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

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 7 * 22)}px`;
  }, [value]);

  const canSend = !disabled && value.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-overlay p-2 pl-4 shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-all duration-200 ease-standard focus-within:border-accent/70 focus-within:shadow-[0_0_0_3px_var(--accent-muted)]">
        <textarea
          ref={textareaRef}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={disabled ? 'Testimonium is thinking…' : 'Ask anything about your document…'}
          rows={1}
          aria-label="Ask a question about your document"
          className="max-h-[154px] flex-1 resize-none bg-transparent py-2 font-ui text-[15px] leading-[22px] text-primary placeholder:text-secondary focus:outline-none disabled:cursor-not-allowed"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canSend}
          aria-label={disabled ? 'Waiting for response' : 'Send question'}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-on transition-all duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-hover disabled:text-tertiary"
        >
          {disabled ? <IconSpinner className="h-4 w-4" /> : <IconSend className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-2 px-1 font-ui text-[11px] text-tertiary">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}
