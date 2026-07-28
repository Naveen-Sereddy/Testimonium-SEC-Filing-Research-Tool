import { extractPages } from './pdf';
import { chunkPages } from './chunk';
import { sectionsForPages, tagAndFilterChunks } from './sections';
import { embedTexts } from './embeddings';
import { askModel, type ContextChunk } from './chat';
import { addChunks, getAllChunks } from './store';
import { cosineSimilarity } from './similarity';

export class NoNarrativeSectionsError extends Error {}

export interface UploadResult {
  sessionId: string;
  chunkCount: number;
  pageCount: number;
}

export async function processUpload(buffer: Buffer): Promise<UploadResult> {
  const pages = await extractPages(buffer);
  const sectionMap = sectionsForPages(pages);
  const rawChunks = chunkPages(pages, 1000, 200);
  const filtered = tagAndFilterChunks(rawChunks, sectionMap);

  if (filtered.length === 0) {
    throw new NoNarrativeSectionsError('No narrative sections detected in this document');
  }

  const embeddings = await embedTexts(filtered.map((c) => c.text));
  const sessionId = crypto.randomUUID();
  await addChunks(sessionId, filtered.map((c, i) => ({ ...c, embedding: embeddings[i] })));

  return { sessionId, chunkCount: filtered.length, pageCount: pages.length };
}

export interface Citation {
  id: number;
  page: number;
  section: string;
  excerpt: string;
}

export type Confidence = 'High' | 'Medium' | 'Low';

export interface QueryResult {
  answer: string;
  citations: Citation[];
  confidence: Confidence;
}

const FALLBACK = "I don't know based on the provided document.";
const HIGH_THRESHOLD = 0.85;
const MEDIUM_THRESHOLD = 0.6;
const HIGH_MIN_COUNT = 3;

export function confidenceLabel(topScores: number[]): Confidence {
  const strongCount = topScores.filter((s) => s >= HIGH_THRESHOLD).length;
  if (strongCount >= HIGH_MIN_COUNT) return 'High';
  if ((topScores[0] ?? 0) >= MEDIUM_THRESHOLD) return 'Medium';
  return 'Low';
}

export async function answerQuestion(sessionId: string, question: string, k = 5): Promise<QueryResult> {
  const all = await getAllChunks(sessionId);

  if (all.length === 0) {
    return { answer: FALLBACK, citations: [], confidence: 'Low' };
  }

  const [queryEmbedding] = await embedTexts([question]);
  const scored = all
    .map((chunk) => ({ chunk, score: cosineSimilarity(chunk.embedding, queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  const context: ContextChunk[] = scored.map((s, i) => ({
    index: i + 1,
    text: s.chunk.text,
    page: s.chunk.page,
    section: s.chunk.section,
  }));

  const answer = await askModel(question, context);

  const citations: Citation[] = context.map((c) => ({
    id: c.index,
    page: c.page,
    section: c.section,
    excerpt: c.text.slice(0, 200),
  }));

  return { answer, citations, confidence: confidenceLabel(scored.map((s) => s.score)) };
}
