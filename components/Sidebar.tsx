export interface SidebarSession {
  id: string;
  question: string;
  timestamp: number;
}

export interface SidebarProps {
  sessions: SidebarSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClear: () => void;
}

export function Sidebar({ sessions, activeId, onSelect, onClear }: SidebarProps) {
  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-r border-border bg-raised p-4 md:flex">
      <p className="mb-3 font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-secondary">Recent</p>

      {sessions.length === 0 ? (
        <p className="font-ui text-[14px] leading-[22px] text-tertiary">
          No conversations yet. Upload a document to start.
        </p>
      ) : (
        <ul className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {sessions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className={`w-full rounded-md border-l-2 px-3 py-2 text-left transition-colors duration-150 ${
                  activeId === s.id ? 'border-accent bg-hover' : 'border-transparent hover:bg-hover'
                }`}
              >
                <p className="truncate font-ui text-[14px] text-primary">{s.question.slice(0, 40)}</p>
                <p className="font-ui text-[11px] text-tertiary">{new Date(s.timestamp).toLocaleTimeString()}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onClear}
        className="mt-3 self-start font-ui text-[13px] text-secondary transition-colors duration-150 hover:text-primary"
      >
        Clear history
      </button>
    </aside>
  );
}
