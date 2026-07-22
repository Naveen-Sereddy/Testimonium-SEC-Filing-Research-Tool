'use client';

import { useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { Sidebar, type SidebarSession } from '@/components/Sidebar';
import { UploadZone } from '@/components/UploadZone';
import { DocumentInfoBar } from '@/components/DocumentInfoBar';
import { ChatInput } from '@/components/ChatInput';
import { EmptyState } from '@/components/EmptyState';
import { ResponseCard } from '@/components/ResponseCard';
import { ErrorState } from '@/components/ErrorState';
import { SettingsPanel } from '@/components/SettingsPanel';
import type { QueryResult } from '@/lib/rag';

interface Message extends QueryResult {
  id: string;
  question: string;
  timestamp: number;
}

type DocState =
  | { status: 'idle' }
  | { status: 'dragover' }
  | { status: 'uploading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; fileName: string; pageCount: number; chunkCount: number };

export default function Page() {
  const [docState, setDocState] = useState<DocState>({ status: 'idle' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [citationDepth, setCitationDepth] = useState<'brief' | 'standard' | 'detailed'>('standard');

  const handleFileSelected = async (file: File) => {
    setDocState({ status: 'uploading' });
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    const body = await res.json();

    if (!res.ok) {
      setDocState({ status: 'error', message: body.error ?? 'Upload failed' });
      return;
    }

    setDocState({
      status: 'ready',
      fileName: file.name,
      pageCount: body.pageCount,
      chunkCount: body.chunkCount,
    });
  };

  const runQuery = async (question: string) => {
    setQueryError(null);
    const res = await fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });
    const body = await res.json();

    if (!res.ok) {
      setQueryError(body.error ?? 'Something went wrong');
      return;
    }

    const message: Message = {
      id: crypto.randomUUID(),
      question,
      timestamp: Date.now(),
      ...(body as QueryResult),
    };
    setMessages((prev) => [...prev, message]);
  };

  const sessions: SidebarSession[] = messages.map((m) => ({ id: m.id, question: m.question, timestamp: m.timestamp }));

  return (
    <div className="flex min-h-screen flex-col">
      <NavBar
        onNewThread={() => {
          setDocState({ status: 'idle' });
          setMessages([]);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex flex-1">
        <Sidebar
          sessions={sessions}
          activeId={messages.at(-1)?.id ?? null}
          onSelect={() => {}}
          onClear={() => setMessages([])}
        />

        <main className="flex flex-1 flex-col gap-6 px-8 py-8">
          {docState.status === 'ready' && (
            <DocumentInfoBar
              fileName={docState.fileName}
              pageCount={docState.pageCount}
              chunkCount={docState.chunkCount}
              onRemove={() => setDocState({ status: 'idle' })}
            />
          )}

          {docState.status !== 'ready' && (
            <UploadZone
              status={docState.status === 'idle' ? 'idle' : docState.status === 'uploading' ? 'uploading' : docState.status === 'error' ? 'error' : 'idle'}
              errorMessage={docState.status === 'error' ? docState.message : undefined}
              onFileSelected={handleFileSelected}
              onRetry={() => setDocState({ status: 'idle' })}
            />
          )}

          {docState.status === 'ready' && messages.length === 0 && (
            <EmptyState onSuggestionClick={(text) => setInputValue(text)} />
          )}

          <div className="flex flex-1 flex-col gap-6">
            {messages.map((m) => (
              <ResponseCard
                key={m.id}
                answer={m.answer}
                citations={m.citations}
                confidence={m.confidence}
                timestamp={m.timestamp}
                onCopy={() => {}}
                onRegenerate={() => runQuery(m.question)}
              />
            ))}
          </div>

          {queryError && <ErrorState message={queryError} onRetry={() => setQueryError(null)} />}

          {docState.status === 'ready' && (
            <ChatInput value={inputValue} onChange={setInputValue} onSubmit={runQuery} />
          )}
        </main>
      </div>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        citationDepth={citationDepth}
        onCitationDepthChange={setCitationDepth}
      />
    </div>
  );
}
