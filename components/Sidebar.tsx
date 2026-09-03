import { IconMessageOff, IconFile } from './icons';

export interface SidebarSession {
  id: string;
  question: string;
  timestamp: number;
}

export interface SidebarProps {
  documentName: string | null;
  sessions: SidebarSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}

// Questions remain nested under the active session. A session may contain one
// filing for ordinary Q&A or a pair for comparison; the comparison surface is
// intentionally separate from the conversation so the reading flow stays calm.
export function Sidebar({ documentName, sessions, activeId, onSelect, onClear }: SidebarProps) {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col border-r border-border bg-raised p-4 md:flex">
      {sessions.length === 0 || !documentName ? (
        <>
          <p className="mb-3 px-1 font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">Recent</p>
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
            <IconMessageOff className="h-5 w-5 text-tertiary" aria-hidden="true" />
            <p className="font-ui text-[13px] leading-[19px] text-tertiary">No conversations yet. Upload a document to start.</p>
          </div>
        </>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2 px-1">
            <IconFile className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
            <p className="truncate font-ui text-[12px] font-medium text-primary" title={documentName}>
              {documentName}
            </p>
          </div>
          <ul className="scroll-thin flex flex-1 flex-col gap-1 overflow-y-auto border-l border-border pl-3">
            {sessions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onSelect(s.id)}
                  aria-current={activeId === s.id ? 'true' : undefined}
                  className={`min-h-[44px] w-full rounded-lg px-3 py-2 text-left transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    activeId === s.id ? 'bg-accent-muted' : 'hover:bg-hover'
                  }`}
                >
                  <p className="truncate font-ui text-[13px] text-primary">{s.question.slice(0, 40)}</p>
                  <p className="font-ui text-[11px] text-tertiary">
                    {new Date(s.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {sessions.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 inline-flex min-h-[44px] items-center self-start rounded-lg px-2 -ml-2 font-ui text-[13px] text-secondary transition-colors duration-150 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Clear history
        </button>
      )}
    </aside>
  );
}
