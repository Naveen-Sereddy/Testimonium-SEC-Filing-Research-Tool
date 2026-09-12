'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
import { EvidencePanel } from '@/components/EvidencePanel';
import { Onboarding } from '@/components/Onboarding';
import { ComparisonPanel } from '@/components/ComparisonPanel';
import { useOnboarding } from '@/hooks/useOnboarding';
import type { QueryResult, Citation, UploadProgress } from '@/lib/rag';
import type { SessionDocument } from '@/lib/store';
import type { FilingComparison } from '@/lib/compare';

const DIRECT_UPLOAD_BYTES = 4 * 1024 * 1024;
const UPLOAD_PART_BYTES = 3 * 1024 * 1024;

interface Message extends QueryResult {
  id: string;
  question: string;
  timestamp: number;
}

interface DocumentInfo {
  fileName: string;
  pageCount: number;
  chunkCount: number;
  sessionId: string;
  indexedSections: string[];
  company: string | null;
  fiscalYearEnd: string | null;
  documents: SessionDocument[];
}

interface PersistedWorkspace {
  version: 1;
  document: DocumentInfo;
  messages: Message[];
}

const WORKSPACE_STORAGE_KEY = 'testimonium-workspace-v1';
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

type DocState =
  | { status: 'idle' }
  | { status: 'dragover' }
  | { status: 'uploading'; progress?: UploadProgress }
  | { status: 'error'; message: string }
  | ({ status: 'success' } & DocumentInfo)
  | ({ status: 'ready' } & DocumentInfo);

export default function Page() {
  const [docState, setDocState] = useState<DocState>({ status: 'idle' });
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<{ question: string; replaceId?: string } | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [citationDepth, setCitationDepth] = useState<'brief' | 'standard' | 'detailed'>('standard');
  const [evidence, setEvidence] = useState<Citation | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [comparison, setComparison] = useState<FilingComparison | null>(null);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const { showOnboarding, complete: completeOnboarding, replay: replayOnboarding } = useOnboarding();
  const [uploadedFileUrls, setUploadedFileUrls] = useState<Record<string, string>>({});
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const queryAbortRef = useRef<AbortController | null>(null);
  const runQueryRef = useRef<((question: string, replaceId?: string) => Promise<void>) | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'complete' | 'error'>('idle');
  const restoredWorkspaceRef = useRef(false);
  const queuedExampleQuestionRef = useRef<string | null>(null);

  // A citation opens the user's PDF in another tab. The application itself
  // can be re-mounted when they return, so preserve the lightweight workspace
  // descriptor and transcript locally. The indexed chunks remain on the
  // server under sessionId; File objects deliberately are not persisted.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (!stored) return;
      const workspace = JSON.parse(stored) as PersistedWorkspace;
      if (
        workspace.version === 1
        && typeof workspace.document?.sessionId === 'string'
        && Array.isArray(workspace.messages)
      ) {
        setDocState({ status: 'ready', ...workspace.document });
        setMessages(workspace.messages);
      }
    } catch {
      window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    } finally {
      restoredWorkspaceRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!restoredWorkspaceRef.current || docState.status !== 'ready') return;
    const document: DocumentInfo = {
      fileName: docState.fileName,
      pageCount: docState.pageCount,
      chunkCount: docState.chunkCount,
      sessionId: docState.sessionId,
      indexedSections: docState.indexedSections,
      company: docState.company,
      fiscalYearEnd: docState.fiscalYearEnd,
      documents: docState.documents,
    };
    const workspace: PersistedWorkspace = { version: 1, document, messages };
    window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  }, [docState, messages]);

  // Kept client-side only (never uploaded anywhere beyond the parse request)
  // so the Evidence panel can deep-link into the user's own file, real
  // page-anchored navigation via the browser's native PDF viewer, not a
  // placeholder action.
  useEffect(() => {
    if (uploadedFiles.length === 0 && !uploadedFile) {
      setUploadedFileUrls({});
      return;
    }
    const files = uploadedFiles.length > 0 ? uploadedFiles : [uploadedFile as File];
    const urls = Object.fromEntries(files.map((file, index) => [`filing-${index + 1}`, URL.createObjectURL(file)]));
    setUploadedFileUrls(urls);
    return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
  }, [uploadedFile, uploadedFiles]);

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
    const { fileName, pageCount, chunkCount, sessionId, indexedSections, company, fiscalYearEnd, documents } = docState;
    const timer = setTimeout(() => {
      setDocState({ status: 'ready', fileName, pageCount, chunkCount, sessionId, indexedSections, company, fiscalYearEnd, documents });
    }, 700);
    return () => clearTimeout(timer);
  }, [docState]);

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const totalSize = files.reduce((total, file) => total + file.size, 0);
    if (totalSize > MAX_UPLOAD_BYTES) {
      setDocState({ status: 'error', message: `The selected files total ${(totalSize / 1024 / 1024).toFixed(1)}MB, which exceeds the 50MB combined upload limit.` });
      return;
    }
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
    setDocState({ status: 'uploading', progress: { stage: 'Extracting text', completed: 0, total: files.length } });
    setUploadedFiles(files);
    setUploadedFile(files[0]);
    try {
      let res: Response;
      if (totalSize > DIRECT_UPLOAD_BYTES) {
        const uploads: Array<{ uploadId: string; fileName: string; contentType: string; size: number; totalParts: number }> = [];
        let completedParts = 0;
        const partTotal = files.reduce((total, file) => total + Math.ceil(file.size / UPLOAD_PART_BYTES), 0);
        for (const file of files) {
          const uploadId = crypto.randomUUID();
          const totalParts = Math.ceil(file.size / UPLOAD_PART_BYTES);
          const descriptor = { uploadId, fileName: file.name, contentType: file.type, size: file.size, totalParts };
          for (let index = 0; index < totalParts; index += 1) {
            setDocState({ status: 'uploading', progress: { stage: 'Uploading', completed: completedParts, total: partTotal } });
            const part = new File([file.slice(index * UPLOAD_PART_BYTES, Math.min(file.size, (index + 1) * UPLOAD_PART_BYTES))], file.name, { type: file.type });
            const partData = new FormData();
            Object.entries({ ...descriptor, index: String(index) }).forEach(([key, value]) => partData.append(key, String(value)));
            partData.append('part', part);
            const partResponse = await fetch('/api/upload/part', { method: 'POST', body: partData });
            if (!partResponse.ok) {
              const body = await partResponse.json().catch(() => ({})) as { error?: string };
              throw new Error(body.error ?? `Could not upload part ${index + 1} of ${totalParts}.`);
            }
            completedParts += 1;
            setDocState({ status: 'uploading', progress: { stage: 'Uploading', completed: completedParts, total: partTotal } });
          }
          uploads.push(descriptor);
        }
        res = await fetch('/api/upload/complete', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify({ uploads }) });
      } else {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
        res = await fetch('/api/upload', { method: 'POST', headers: { Accept: 'text/event-stream' }, body: formData });
      }
      if (!res.ok) {
        let message = 'Upload failed. Please try again.';
        try {
          const body = await res.json() as { error?: string };
          message = body.error ?? message;
        } catch {
          if (res.status === 413) message = 'This upload was rejected before processing. The combined file size must be 50MB or less.';
        }
        throw new Error(message);
      }
      if (!res.body) throw new Error('Upload progress was unavailable. Please try again.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffered = '';
      let completed = false;
      while (true) {
        const { value, done } = await reader.read();
        buffered += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const events = buffered.split('\n\n');
        buffered = events.pop() ?? '';
        for (const event of events) {
          const data = event.split('\n').find((line) => line.startsWith('data: '))?.slice(6);
          if (!data) continue;
          const message = JSON.parse(data) as { type: string; progress?: UploadProgress; result?: DocumentInfo; error?: string };
          if (message.type === 'progress' && message.progress) setDocState({ status: 'uploading', progress: message.progress });
          if (message.type === 'error') { setDocState({ status: 'error', message: message.error ?? 'Upload failed' }); return; }
          if (message.type === 'complete' && message.result) {
            const body = message.result;
            setDocState({ status: 'success', fileName: files.map((file) => file.name).join(' · '), pageCount: body.pageCount, chunkCount: body.chunkCount, sessionId: body.sessionId, indexedSections: body.indexedSections ?? [], company: body.company ?? null, fiscalYearEnd: body.fiscalYearEnd ?? null, documents: body.documents ?? [] });
            completed = true;
          }
        }
        if (done) break;
      }
      if (!completed) throw new Error('Upload ended before indexing completed. Please try again.');
    } catch (error) {
      setDocState({ status: 'error', message: error instanceof Error ? error.message : 'Network error — please try again.' });
    }
  };

  const handleFileSelected = (file: File) => handleFilesSelected([file]);

  const handleSample = async () => {
    try {
      const response = await fetch('/demo/sample-10k.pdf');
      if (!response.ok) throw new Error('Sample filing could not be loaded.');
      await handleFilesSelected([new File([await response.blob()], 'Testimonium sample 10-K.pdf', { type: 'application/pdf' })]);
    } catch (error) {
      setDocState({ status: 'error', message: error instanceof Error ? error.message : 'Sample filing could not be loaded.' });
    }
  };

  const runQuery = useCallback(async (question: string, replaceId?: string) => {
    if (docState.status !== 'ready') return;
    const { sessionId } = docState;

    setQueryError(null);
    setLastFailedQuery(null);
    setStreamingAnswer('');
    if (replaceId) setRegeneratingId(replaceId);
    else setPendingQuestion(question);

    try {
      const controller = new AbortController();
      queryAbortRef.current = controller;
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ question, sessionId, citationDepth, history: messages.slice(-3).map((message) => ({ question: message.question, answer: message.answer })) }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        setQueryError(body.error ?? 'Something went wrong');
        setLastFailedQuery({ question, replaceId });
        return;
      }
      if (!res.body) throw new Error('Answer stream was unavailable.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffered = '';
      let complete = false;
      while (true) {
        const { value, done } = await reader.read();
        buffered += decoder.decode(value ?? new Uint8Array(), { stream: !done });
        const events = buffered.split('\n\n'); buffered = events.pop() ?? '';
        for (const event of events) {
          const data = event.split('\n').find((line) => line.startsWith('data: '))?.slice(6);
          if (!data) continue;
          const message = JSON.parse(data) as { type: string; token?: string; result?: QueryResult; error?: string };
          if (message.type === 'token' && message.token) setStreamingAnswer((previous) => previous + message.token);
          if (message.type === 'error') { setQueryError(message.error ?? 'Something went wrong'); setLastFailedQuery({ question, replaceId }); return; }
          if (message.type === 'complete' && message.result) {
            const result: Message = { id: replaceId ?? crypto.randomUUID(), question, timestamp: Date.now(), ...message.result };
            setMessages((previous) => replaceId ? previous.map((entry) => entry.id === replaceId ? result : entry) : [...previous, result]);
            complete = true;
          }
        }
        if (done) break;
      }
      if (!complete) throw new Error('Answer stream ended before the citation check completed.');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setQueryError('Answer generation stopped.');
        return;
      }
      setQueryError('Network error — please try again.');
      setLastFailedQuery({ question, replaceId });
    } finally {
      setRegeneratingId(null);
      setPendingQuestion(null);
      setStreamingAnswer('');
      queryAbortRef.current = null;
    }
  }, [citationDepth, docState, messages]);
  useEffect(() => {
    runQueryRef.current = runQuery;
  }, [runQuery]);

  // Landing-page examples are actionable: load the public sample and then
  // ask the selected question as soon as indexing has actually completed.
  useEffect(() => {
    if (docState.status !== 'ready' || !queuedExampleQuestionRef.current) return;
    const question = queuedExampleQuestionRef.current;
    queuedExampleQuestionRef.current = null;
    void runQueryRef.current?.(question);
  }, [docState]);

  const handleExampleQuestion = (question: string) => {
    queuedExampleQuestionRef.current = question;
    setInputValue(question);
    void handleSample();
  };

  const resetToIdle = () => {
    if (docState.status === 'ready' || docState.status === 'success') {
      const { sessionId } = docState;
      void fetch('/api/session', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch((error) => console.error('Session cleanup failed:', error));
    }
    setDocState({ status: 'idle' });
    setMessages([]);
    setQueryError(null);
    setPendingQuestion(null);
    setRegeneratingId(null);
    setSelectedMessageId(null);
    setInputValue('');
    setEvidence(null);
    setUploadedFile(null);
    setUploadedFiles([]);
    setComparison(null);
    setComparisonError(null);
    queuedExampleQuestionRef.current = null;
    window.localStorage.removeItem(WORKSPACE_STORAGE_KEY);
  };

  const requestNewAnalysis = () => {
    if (messages.length > 0) { setConfirmResetOpen(true); return; }
    if (docState.status === 'ready' || docState.status === 'success') { resetToIdle(); return; }
    uploadInputRef.current?.focus();
  };

  const exportConversation = () => {
    if (messages.length === 0) return;
    try {
      const transcript = messages.map((message) => {
        const sources = message.citations.map((citation) => `- [${citation.id}] Page ${citation.page}, ${citation.section}: ${citation.excerpt}`).join('\n');
        return `## Q: ${message.question}\n\n${message.answer}\n\n### Sources\n${sources || 'No cited sources.'}`;
      }).join('\n\n---\n\n');
      const url = URL.createObjectURL(new Blob([`# Testimonium conversation\n\n${transcript}\n`], { type: 'text/markdown' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'testimonium-conversation.md';
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setExportStatus('complete');
      window.setTimeout(() => setExportStatus('idle'), 2_500);
    } catch {
      setExportStatus('error');
    }
  };

  const runComparison = async () => {
    if (docState.status !== 'ready' || docState.documents.length < 2) return;
    setComparisonError(null);
    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: docState.sessionId }),
      });
      const body = await res.json();
      if (!res.ok) {
        setComparisonError(body.error ?? 'Comparison failed');
        return;
      }
      setComparison(body as FilingComparison);
    } catch {
      setComparisonError('Network error — please try again.');
    }
  };

  const fileUrlForCitation = (citation: Citation) =>
    citation.documentId ? uploadedFileUrls[citation.documentId] ?? null : uploadedFileUrls['filing-1'] ?? null;

  const sessions: SidebarSession[] = messages.map((m) => ({ id: m.id, question: m.question, timestamp: m.timestamp }));
  const isBusy = pendingQuestion !== null || regeneratingId !== null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <NavBar onNewThread={requestNewAnalysis} onOpenHelp={() => setSettingsOpen(true)} onExport={messages.length > 0 ? exportConversation : undefined} exportStatus={exportStatus} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          documentName={docState.status === 'ready' || docState.status === 'success' ? docState.fileName : null}
          sessions={sessions}
          activeId={selectedMessageId ?? messages.at(-1)?.id ?? null}
          onSelect={(id) => {
            setSelectedMessageId(id);
            document.getElementById(`message-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          onClear={() => {
            if (!window.confirm('Clear conversation history? This cannot be undone.')) return;
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
              company={docState.company}
              fiscalYearEnd={docState.fiscalYearEnd}
              onRemove={resetToIdle}
              documents={docState.documents}
              onCompare={runComparison}
            />
          )}

          {comparison && (
            <ComparisonPanel
              comparison={comparison}
              onClose={() => setComparison(null)}
              fileUrlForDocumentId={(documentId) => uploadedFileUrls[documentId] ?? null}
            />
          )}
          {comparisonError && (
            <p role="alert" className="border-b border-border bg-base px-4 py-3 text-center font-ui text-[13px] text-error">
              {comparisonError}
            </p>
          )}

          <div ref={scrollContainerRef} className="scroll-thin flex-1 overflow-y-auto scroll-smooth px-4 sm:px-6 lg:px-8">
            <div className="mx-auto flex min-h-full w-full max-w-[820px] flex-col gap-6 py-6">
              {docState.status !== 'ready' && (
                <div className="flex min-h-full flex-1 items-center justify-center py-10">
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
                    progress={docState.status === 'uploading' ? docState.progress : undefined}
                    onFileSelected={handleFileSelected}
                    onFilesSelected={handleFilesSelected}
                    onSample={handleSample}
                    onExampleQuestion={handleExampleQuestion}
                    uploadInputRef={uploadInputRef}
                    onRetry={() => setDocState({ status: 'idle' })}
                  />
                </div>
              )}

              {docState.status === 'ready' && messages.length === 0 && !pendingQuestion && (
                <EmptyState onSuggestionClick={runQuery} />
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
                    <PendingResponseCard text={streamingAnswer} onCancel={() => queryAbortRef.current?.abort()} />
                  ) : (
                    <ResponseCard
                      answer={m.answer}
                      citations={m.citations}
                      confidence={m.confidence}
                      explanation={m.explanation}
                      timestamp={m.timestamp}
                      onCopy={() => {}}
                      onRegenerate={() => runQuery(m.question, m.id)}
                      onEvidenceSelect={setEvidence}
                      fileUrl={uploadedFileUrls['filing-1'] ?? null}
                      fileUrlForCitation={fileUrlForCitation}
                      indexedSections={docState.status === 'ready' ? docState.indexedSections : []}
                      onFollowUp={runQuery}
                      question={m.question}
                    />
                  )}
                </div>
              ))}

              {pendingQuestion && (
                <div className="flex flex-col gap-3" style={{ animation: 'fadeInUp 260ms cubic-bezier(0.16,1,0.3,1)' }}>
                  <UserMessageBubble question={pendingQuestion} />
                  <PendingResponseCard text={streamingAnswer} onCancel={() => queryAbortRef.current?.abort()} />
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

        {docState.status === 'ready' && (
          <EvidencePanel
            citation={evidence}
            fileName={docState.fileName}
            fileUrl={uploadedFileUrls['filing-1'] ?? null}
            fileUrlForCitation={fileUrlForCitation}
          />
        )}
      </div>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onReplayOnboarding={() => {
          setSettingsOpen(false);
          replayOnboarding();
        }}
      />

      {showOnboarding && <Onboarding onComplete={completeOnboarding} onUpload={() => uploadInputRef.current?.click()} />}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="alertdialog" aria-modal="true" aria-labelledby="discard-analysis-title">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-raised p-6 shadow-xl">
            <h2 id="discard-analysis-title" className="font-ui text-lg font-semibold text-primary">Discard this analysis?</h2>
            <p className="mt-2 font-ui text-sm leading-5 text-secondary">This clears the uploaded filing and the current conversation.</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirmResetOpen(false)} className="min-h-[44px] rounded-lg px-3 font-ui text-sm text-secondary">Keep analysis</button><button type="button" onClick={() => { setConfirmResetOpen(false); resetToIdle(); }} className="min-h-[44px] rounded-lg bg-accent px-3 font-ui text-sm font-medium text-on">Discard</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
