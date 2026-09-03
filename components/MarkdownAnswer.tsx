import type { ReactNode } from 'react';
import type { Citation } from '@/lib/rag';
import { splitAnswerOnCitations } from '@/lib/parseCitations';
import { CitationChip } from './CitationChip';

type BlockType = 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'table';
interface Block {
  type: BlockType;
  items: string[];
}

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let buffer: Block | null = null;

  const flush = () => {
    if (buffer !== null && buffer.items.length > 0) blocks.push(buffer);
    buffer = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }

    const h3 = /^###\s+(.*)/.exec(line);
    const h2 = /^##\s+(.*)/.exec(line);
    const h1 = /^#\s+(.*)/.exec(line);
    const ul = /^[-*]\s+(.*)/.exec(line);
    const ol = /^\d+\.\s+(.*)/.exec(line);
    const table = /^\|(.+)\|$/.exec(line);

    if (table) {
      if (!buffer || buffer.type !== 'table') {
        flush();
        buffer = { type: 'table', items: [] };
      }
      if (!/^\s*\|?(?:\s*:?-+:?\s*\|)+\s*$/.test(line)) buffer.items.push(line);
    } else if (h3) {
      flush();
      blocks.push({ type: 'h3', items: [h3[1]] });
    } else if (h2) {
      flush();
      blocks.push({ type: 'h2', items: [h2[1]] });
    } else if (h1) {
      flush();
      blocks.push({ type: 'h1', items: [h1[1]] });
    } else if (ul) {
      if (!buffer || buffer.type !== 'ul') {
        flush();
        buffer = { type: 'ul', items: [] };
      }
      buffer.items.push(ul[1]);
    } else if (ol) {
      if (!buffer || buffer.type !== 'ol') {
        flush();
        buffer = { type: 'ol', items: [] };
      }
      buffer.items.push(ol[1]);
    } else {
      if (!buffer || buffer.type !== 'p') {
        flush();
        buffer = { type: 'p', items: [] };
      }
      buffer.items.push(line);
    }
  }
  flush();
  return blocks;
}

const INLINE_RE = /\*\*(.+?)\*\*|`([^`]+)`|(\[FY\s*\d{2,4}\s+p(?:age)?\.?\s*\d+\s*(?:->|→)\s*FY\s*\d{2,4}\s+p(?:age)?\.?\s*\d+\])|\[(\d+)\]/gi;

function renderInline(
  text: string,
  keyPrefix: string,
  citationById: Map<number, Citation>,
  activeCitationId: number | null,
  onCitationClick: (id: number) => void,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let idx = 0;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));

    if (match[1] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b-${idx}`} className="font-semibold text-primary">
          {match[1]}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      nodes.push(
        <code key={`${keyPrefix}-c-${idx}`} className="rounded bg-hover px-1.5 py-0.5 font-mono text-[0.88em] text-primary">
          {match[2]}
        </code>,
      );
    } else if (match[3] !== undefined) {
      const [segment] = splitAnswerOnCitations(match[3], Array.from(citationById.values()));
      if (segment?.type === 'dual-citation') {
        nodes.push(
          <span key={`${keyPrefix}-dual-${idx}`} className="mx-1 inline-flex items-center gap-1 align-middle font-ui text-[11px]">
            <button
              type="button"
              onClick={() => onCitationClick(segment.previousId)}
              className="inline-flex min-h-[44px] items-center rounded-full border border-border bg-overlay px-2 text-secondary hover:border-accent hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {segment.previousLabel}
            </button>
            <span className="text-tertiary" aria-hidden="true">→</span>
            <button
              type="button"
              onClick={() => onCitationClick(segment.currentId)}
              className="inline-flex min-h-[44px] items-center rounded-full border border-border bg-overlay px-2 text-secondary hover:border-accent hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {segment.currentLabel}
            </button>
          </span>,
        );
      } else {
        nodes.push(match[0]);
      }
    } else if (match[4] !== undefined) {
      const id = Number(match[4]);
      const citation = citationById.get(id);
      if (citation) {
        nodes.push(
          <span key={`${keyPrefix}-cite-${idx}`} className="mx-0.5 inline-block align-super">
            <CitationChip
              citation={citation}
              isActive={activeCitationId === id}
              isDimmed={activeCitationId !== null && activeCitationId !== id}
              onClick={() => onCitationClick(id)}
            />
          </span>,
        );
      } else {
        nodes.push(match[0]);
      }
    }
    idx++;
    lastIndex = INLINE_RE.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export interface MarkdownAnswerProps {
  text: string;
  citationById: Map<number, Citation>;
  activeCitationId: number | null;
  onCitationClick: (id: number) => void;
}

export function MarkdownAnswer({ text, citationById, activeCitationId, onCitationClick }: MarkdownAnswerProps) {
  const blocks = parseBlocks(text);
  const inline = (value: string, key: string) => renderInline(value, key, citationById, activeCitationId, onCitationClick);

  return (
    <div className="space-y-3 font-serif text-[16px] leading-[27px] text-primary sm:text-[17px] sm:leading-[28px]">
      {blocks.map((block, i) => {
        const key = `block-${i}`;
        if (block.type === 'h1') {
          return (
            <h3 key={key} className="font-ui text-[19px] font-semibold leading-[26px] text-primary">
              {inline(block.items[0], key)}
            </h3>
          );
        }
        if (block.type === 'h2') {
          return (
            <h4 key={key} className="font-ui text-[16px] font-semibold leading-[23px] text-primary">
              {inline(block.items[0], key)}
            </h4>
          );
        }
        if (block.type === 'h3') {
          return (
            <h5 key={key} className="font-ui text-[14px] font-semibold uppercase tracking-[0.03em] text-secondary">
              {inline(block.items[0], key)}
            </h5>
          );
        }
        if (block.type === 'ul') {
          return (
            <ul key={key} className="list-disc space-y-1.5 pl-5 marker:text-tertiary">
              {block.items.map((item, j) => (
                <li key={j}>{inline(item, `${key}-${j}`)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={key} className="list-decimal space-y-1.5 pl-5 marker:text-tertiary">
              {block.items.map((item, j) => (
                <li key={j}>{inline(item, `${key}-${j}`)}</li>
              ))}
            </ol>
          );
        }
        if (block.type === 'table') {
          const rows = block.items.map((row) => row.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()));
          const [header, ...body] = rows;
          return (
            <div key={key} className="scroll-thin overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full border-collapse font-ui text-[13px] leading-[20px]">
                <thead className="bg-hover text-left text-secondary">
                  <tr>{header.map((cell, j) => <th key={j} className={`border-b border-border px-3 py-2 font-medium ${j > 0 ? 'text-right tabular-nums' : 'text-left'}`}>{inline(cell, `${key}-h-${j}`)}</th>)}</tr>
                </thead>
                <tbody>
                  {body.map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-b-0">
                      {row.map((cell, j) => <td key={j} className={`px-3 py-2 align-top text-primary ${j > 0 ? 'whitespace-nowrap text-right tabular-nums' : 'text-left'}`}>{inline(cell, `${key}-${i}-${j}`)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <p key={key}>{inline(block.items.join(' '), key)}</p>;
      })}
    </div>
  );
}
