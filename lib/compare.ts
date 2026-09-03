import { getAllChunks, getSessionDocuments, type SessionDocument, type StoredChunk } from './store';
import { cosineSimilarity } from './similarity';

export type ChangeKind = 'added' | 'modified' | 'removed';

export interface FilingChange {
  id: string;
  kind: ChangeKind;
  section: string;
  previous?: CitationSide;
  current?: CitationSide;
  similarity: number;
}

export interface CitationSide {
  documentId: string;
  chunkId: string;
  fileName: string;
  filingYear: number | null;
  page: number;
  excerpt: string;
}

export interface FilingComparison {
  previous: SessionDocument;
  current: SessionDocument;
  changes: FilingChange[];
}

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((token) => token.length > 2));
}

function lexicalSimilarity(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) if (b.has(token)) overlap += 1;
  return overlap / new Set([...a, ...b]).size;
}

function similarity(left: StoredChunk, right: StoredChunk): number {
  const semantic = cosineSimilarity(left.embedding, right.embedding);
  const lexical = lexicalSimilarity(left.text, right.text);
  return semantic * 0.7 + lexical * 0.3;
}

function side(chunk: StoredChunk, document: SessionDocument): CitationSide {
  return {
    documentId: document.id,
    chunkId: chunk.id,
    fileName: document.fileName,
    filingYear: document.filingYear,
    page: chunk.page,
    excerpt: chunk.text.slice(0, 500).replace(/\s+\S*$/, ''),
  };
}

function compareSection(previous: StoredChunk[], current: StoredChunk[], previousDoc: SessionDocument, currentDoc: SessionDocument): FilingChange[] {
  const changes: FilingChange[] = [];
  const usedPrevious = new Set<string>();
  const threshold = 0.28;

  for (const currentChunk of current) {
    let best: { chunk: StoredChunk; score: number } | null = null;
    for (const previousChunk of previous) {
      if (usedPrevious.has(previousChunk.id)) continue;
      const score = similarity(previousChunk, currentChunk);
      if (!best || score > best.score) best = { chunk: previousChunk, score };
    }

    if (!best || best.score < threshold) {
      changes.push({
        id: `added-${currentChunk.id}`,
        kind: 'added',
        section: currentChunk.section,
        current: side(currentChunk, currentDoc),
        similarity: best?.score ?? 0,
      });
      continue;
    }

    usedPrevious.add(best.chunk.id);
    if (best.score < 0.94) {
      changes.push({
        id: `modified-${currentChunk.id}`,
        kind: 'modified',
        section: currentChunk.section,
        previous: side(best.chunk, previousDoc),
        current: side(currentChunk, currentDoc),
        similarity: best.score,
      });
    }
  }

  for (const previousChunk of previous) {
    if (!usedPrevious.has(previousChunk.id)) {
      changes.push({
        id: `removed-${previousChunk.id}`,
        kind: 'removed',
        section: previousChunk.section,
        previous: side(previousChunk, previousDoc),
        similarity: 0,
      });
    }
  }

  return changes;
}

export async function compareSessionFilings(sessionId: string): Promise<FilingComparison | null> {
  const documents = await getSessionDocuments(sessionId);
  if (documents.length < 2) return null;
  const sorted = [...documents].sort((a, b) => (a.filingYear ?? 0) - (b.filingYear ?? 0));
  const previous = sorted[0];
  const current = sorted[sorted.length - 1];
  const chunks = await getAllChunks(sessionId);
  const comparisonSections = new Set(['Risk Factors', 'MD&A']);
  const previousChunks = chunks.filter((chunk) => chunk.documentId === previous.id && comparisonSections.has(chunk.section));
  const currentChunks = chunks.filter((chunk) => chunk.documentId === current.id && comparisonSections.has(chunk.section));
  const sections = Array.from(new Set([...previousChunks, ...currentChunks].map((chunk) => chunk.section)));
  const changes = sections.flatMap((section) =>
    compareSection(
      previousChunks.filter((chunk) => chunk.section === section),
      currentChunks.filter((chunk) => chunk.section === section),
      previous,
      current,
    ),
  );
  return { previous, current, changes };
}
