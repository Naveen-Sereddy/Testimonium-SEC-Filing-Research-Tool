'use client';

import { useEffect, useRef, useState } from 'react';
import { NavBar } from '@/components/NavBar';
import { Sidebar, type SidebarSession } from '@/components/Sidebar';
import { UploadZone } from '@/components/UploadZone';
import { DocumentInfoBar } from '@/components/DocumentInfoBar';
import { ChatInput } from '@/components/ChatInput';
import { EmptyState } from '@/components/EmptyState';
import { ResponseCard, PendingResponseCard } from '@/components/ResponseCard';
import { UserMessageBubble } from '@/components/UserMessageBubble';
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
  | { status: 'success'; fileName: string; pageCount: number; chunkCount: number; sessionId: string; indexedSections: string[] }
  | { status: 'ready'; fileName: string; pageCount: number; chunkCount: number; sessionId: string; indexedSections: string[] };

export default function Page() {
  const [docState, setDocState] = useState<DocState>({ status: 'idle' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<{ question: string; replaceId?: string } | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [citationDepth, setCitationDepth] = useState<'brief' | 'standard' | 'detailed'>('standard');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  // Track whether the user has scrolled away from the bottom, so streaming
  // content only auto-follows when they haven't intentionally scrolled up.
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isNearBottomRef.current = distanceFromBottom < 120;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Auto-follow content growth (e.g. streaming text) while pinned to bottom.
  useEffect(() => {
    const el = scrollContainerRef.current;
    const content = el?.firstElementChild;
    if (!el || !content) return;
    const observer = new ResizeObserver(() => {
      if (isNearBottomRef.current) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [docState.status]);

  // Sending a message always jumps to the latest turn, regardless of prior scroll position.
  useEffect(() => {
    if (messages.length === 0) return;
    isNearBottomRef.current = true;
    scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  // Let the "upload complete" moment land visually before swapping to the document view.
  useEffect(() => {
    if (docState.status !== 'success') return;
    const { fileName, pageCount, chunkCount, sessionId, indexedSections } = docState;
    const timer = setTimeout(() => {
      setDocState({ status: 'ready', fileName, pageCount, chunkCount, sessionId, indexedSections });
    }, 700);
    return () => clearTimeout(timer);
  }, [docState]);

  const handleFileSelected = async (file: File) => {
    setDocState({ status: 'uploading' });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const body = await res.json();

      if (!res.ok) {
        setDocState({ status: 'error', message: body.error ?? 'Upload failed' });
        return;
      }

      setDocState({
        status: 'success',
        fileName: file.name,
        pageCount: body.pageCount,
        chunkCount: body.chunkCount,
        sessionId: body.sessionId,
        indexedSections: body.indexedSections ?? [],
      });
    } catch {
      setDocState({ status: 'error', message: 'Network error — please try again.' });
    }
  };

  const runQuery = async (question: string, replaceId?: string) => {
    if (docState.status !== 'ready') return;
    const { sessionId } = docState;

    setQueryError(null);
    setLastFailedQuery(null);
    if (replaceId) setRegeneratingId(replaceId);
    else setPendingQuestion(question);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sessionId, citationDepth }),
      });
      const body = await res.json();

      if (!res.ok) {
        setQueryError(body.error ?? 'Something went wrong');
        setLastFailedQuery({ question, replaceId });
        return;
      }

      const message: Message = {
        id: replaceId ?? crypto.randomUUID(),
        question,
        timestamp: Date.now(),
        ...(body as QueryResult),
      };
      setMessages((prev) => (replaceId ? prev.map((m) => (m.id === replaceId ? message : m)) : [...prev, message]));
    } catch {
      setQueryError('Network error — please try again.');
      setLastFailedQuery({ question, replaceId });
    } finally {
      setRegeneratingId(null);
      setPendingQuestion(null);
    }
  };

  const resetToIdle = () => {
    if (messages.length > 0 && !window.confirm('Start a new analysis? This clears the current conversation and document.')) {
      return;
    }
    if (docState.status === 'ready' || docState.status === 'success') {
      const { sessionId } = docState;
      fetch('/api/session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
    setDocState({ status: 'idle' });
    setMessages([]);
    setQueryError(null);
    setPendingQuestion(null);
    setRegeneratingId(null);
    setSelectedMessageId(null);
    setInputValue('');
  };

  const sessions: SidebarSession[] = messages.map((m) => ({ id: m.id, question: m.question, timestamp: m.timestamp }));
  const isBusy = pendingQuestion !== null || regeneratingId !== null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <NavBar onNewThread={resetToIdle} onOpenHelp={() => setSettingsOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          sessions={sessions}
          activeId={selectedMessageId ?? messages.at(-1)?.id ?? null}
          onSelect={(id) => {
            setSelectedMessageId(id);
            document.getElementById(`message-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onClear={() => {
            setMessages([]);
            setSelectedMessageId(null);
          }}
        />

        <main className="flex flex-1 flex-col overflow-hidden">
          {docState.status === 'ready' && (
            <DocumentInfoBar
              fileName={docState.fileName}
              pageCount={docState.pageCount}
              indexedSections={docState.indexedSections}
              onRemove={resetToIdle}
            />
          )}

          <div ref={scrollContainerRef} className="scroll-thin flex-1 overflow-y-auto scroll-smooth px-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 py-6">
              {docState.status !== 'ready' && (
                <div className="flex flex-1 items-center justify-center py-10">
                  <UploadZone
                    status={
                      docState.status === 'idle'
                        ? 'idle'
                        : docState.status === 'uploading'
                          ? 'uploading'
                          : docState.status === 'error'
                            ? 'error'
                            : docState.status === 'success'
                              ? 'success'
                              : 'idle'
                    }
                    errorMessage={docState.status === 'error' ? docState.message : undefined}
                    onFileSelected={handleFileSelected}
                    onRetry={() => setDocState({ status: 'idle' })}
                  />
                </div>
              )}

              {docState.status === 'ready' && messages.length === 0 && !pendingQuestion && (
                <EmptyState onSuggestionClick={(text) => setInputValue(text)} />
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  id={`message-${m.id}`}
                  className="flex flex-col gap-3 scroll-mt-4"
                  style={{ animation: 'fadeInUp 260ms cubic-bezier(0.16,1,0.3,1)' }}
                >
                  <UserMessageBubble question={m.question} />
                  {m.id === regeneratingId ? (
                    <PendingResponseCard />
                  ) : (
                    <ResponseCard
                      answer={m.answer}
                      citations={m.citations}
                      confidence={m.confidence}
                      timestamp={m.timestamp}
                      onCopy={() => {}}
                      onRegenerate={() => runQuery(m.question, m.id)}
                    />
                  )}
                </div>
              ))}

              {pendingQuestion && (
                <div className="flex flex-col gap-3" style={{ animation: 'fadeInUp 260ms cubic-bezier(0.16,1,0.3,1)' }}>
                  <UserMessageBubble question={pendingQuestion} />
                  <PendingResponseCard />
                </div>
              )}

              {queryError && (
                <ErrorState
                  message={queryError}
                  onRetry={() => {
                    if (lastFailedQuery) runQuery(lastFailedQuery.question, lastFailedQuery.replaceId);
                    else setQueryError(null);
                  }}
                />
              )}
            </div>
          </div>

          {docState.status === 'ready' && (
            <div className="border-t border-border bg-base px-4 py-4 sm:px-6 lg:px-8">
              <ChatInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={runQuery}
                disabled={isBusy}
                citationDepth={citationDepth}
                onCitationDepthChange={setCitationDepth}
              />
              <p className="mx-auto mt-2 w-full max-w-[820px] px-1 text-center font-ui text-[11px] text-tertiary">
                Testimonium can make mistakes. Verify important details against the source document.
              </p>
            </div>
          )}
        </main>
      </div>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
