export interface CitationLookup {
  id: number;
  page: number;
  filingYear?: number | null;
}

export type AnswerSegment =
  | { type: 'text'; value: string }
  | { type: 'citation'; id: number }
  | {
      type: 'dual-citation';
      previousId: number;
      currentId: number;
      previousLabel: string;
      currentLabel: string;
    };

const TOKEN_PATTERN = /\[(?:FY\s*(\d{2,4})\s+p(?:age)?\.?\s*(\d+)\s*(?:->|→)\s*FY\s*(\d{2,4})\s+p(?:age)?\.?\s*(\d+)|(\d+))\]/gi;

function fullYear(value: string): number {
  const year = Number(value);
  if (value.length === 4) return year;
  return year >= 70 ? 1900 + year : 2000 + year;
}

function findCitation(citations: CitationLookup[], year: number, page: number): CitationLookup | undefined {
  const matches = citations.filter((citation) => citation.filingYear === year && citation.page === page);
  return matches.length === 1 ? matches[0] : undefined;
}

export function splitAnswerOnCitations(answer: string, citations: CitationLookup[] = []): AnswerSegment[] {
  const segments: AnswerSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TOKEN_PATTERN.lastIndex = 0;

  while ((match = TOKEN_PATTERN.exec(answer)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: answer.slice(lastIndex, match.index) });
    }

    if (match[5]) {
      segments.push({ type: 'citation', id: Number(match[5]) });
    } else {
      const previousYear = fullYear(match[1]);
      const previousPage = Number(match[2]);
      const currentYear = fullYear(match[3]);
      const currentPage = Number(match[4]);
      const previous = findCitation(citations, previousYear, previousPage);
      const current = findCitation(citations, currentYear, currentPage);

      if (previous && current) {
        segments.push({
          type: 'dual-citation',
          previousId: previous.id,
          currentId: current.id,
          previousLabel: `FY${String(previousYear).slice(-2)} p. ${previousPage}`,
          currentLabel: `FY${String(currentYear).slice(-2)} p. ${currentPage}`,
        });
      } else {
        segments.push({ type: 'text', value: match[0] });
      }
    }
    lastIndex = TOKEN_PATTERN.lastIndex;
  }

  if (lastIndex < answer.length) {
    segments.push({ type: 'text', value: answer.slice(lastIndex) });
  }

  return segments;
}

export function citedIds(answer: string, citations: CitationLookup[]): { ids: number[]; invalidTokens: string[] } {
  const validIds = new Set(citations.map((citation) => citation.id));
  const ids: number[] = [];
  const invalidTokens: string[] = [];
  let match: RegExpExecArray | null;
  TOKEN_PATTERN.lastIndex = 0;

  while ((match = TOKEN_PATTERN.exec(answer)) !== null) {
    if (match[5]) {
      const id = Number(match[5]);
      if (validIds.has(id)) ids.push(id);
      else invalidTokens.push(match[0]);
      continue;
    }

    const previous = findCitation(citations, fullYear(match[1]), Number(match[2]));
    const current = findCitation(citations, fullYear(match[3]), Number(match[4]));
    if (previous && current) ids.push(previous.id, current.id);
    else invalidTokens.push(match[0]);
  }

  return { ids: Array.from(new Set(ids)), invalidTokens };
}
