import { extractPages } from './pdf';
import { chunkPages } from './chunk';
import { sectionsForPages, tagAndFilterChunks } from './sections';
import { embedTexts } from './embeddings';
import { askModel, FALLBACK, type ContextChunk } from './chat';
import { addChunks, getAllChunks } from './store';
import { cosineSimilarity } from './similarity';
import { extractFilingMetadata } from './metadata';

export class NoNarrativeSectionsError extends Error {}

export interface UploadResult {
  sessionId: string;
  chunkCount: number;
  pageCount: number;
  indexedSections: string[];
  company: string | null;
  fiscalYearEnd: string | null;
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

  const indexedSections = Array.from(new Set(filtered.map((c) => c.section)));
  const { company, fiscalYearEnd } = extractFilingMetadata(pages);

  return { sessionId, chunkCount: filtered.length, pageCount: pages.length, indexedSections, company, fiscalYearEnd };
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
  explanation: string;
}

const HIGH_THRESHOLD = 0.85;
const MEDIUM_THRESHOLD = 0.6;
const HIGH_MIN_COUNT = 3;

export function confidenceLabel(topScores: number[]): Confidence {
  const strongCount = topScores.filter((s) => s >= HIGH_THRESHOLD).length;
  if (strongCount >= HIGH_MIN_COUNT) return 'High';
  if ((topScores[0] ?? 0) >= MEDIUM_THRESHOLD) return 'Medium';
  return 'Low';
}

// A plain-language account of what actually happened during retrieval, built
// entirely from numbers already computed for confidenceLabel — no separate
// model call, so nothing here can say more than the pipeline actually knows.
export function explainRetrieval(passagesRetrieved: number, strongMatches: number, sections: string[], refused: boolean): string {
  if (passagesRetrieved === 0) {
    return 'No indexed content was available to search for this question.';
  }
  const sectionList = sections.length > 0 ? sections.join(', ') : 'the indexed sections';
  const passageWord = passagesRetrieved === 1 ? 'passage' : 'passages';

  if (refused) {
    return strongMatches > 0
      ? `Retrieved ${passagesRetrieved} ${passageWord} from ${sectionList}, but none of them directly answered this question, so no answer was generated.`
      : `Retrieved ${passagesRetrieved} ${passageWord} from ${sectionList}, none closely related to this question, so no answer was generated.`;
  }
  if (strongMatches >= HIGH_MIN_COUNT) {
    return `Retrieved ${passagesRetrieved} ${passageWord} from ${sectionList}. ${strongMatches} of them are strong, consistent matches to your question.`;
  }
  if (strongMatches > 0) {
    return `Retrieved ${passagesRetrieved} ${passageWord} from ${sectionList}. ${strongMatches} scored as a strong match; the rest add supporting context.`;
  }
  return `Retrieved ${passagesRetrieved} ${passageWord} from ${sectionList}, but none matched closely. Check the citations before relying on this answer.`;
}

export async function answerQuestion(sessionId: string, question: string, k = 5): Promise<QueryResult> {
  const all = await getAllChunks(sessionId);

  if (all.length === 0) {
    return { answer: FALLBACK, citations: [], confidence: 'Low', explanation: explainRetrieval(0, 0, [], true) };
  }

  const [queryEmbedding] = await embedTexts([question]);
  const scored = all
    .map((chunk) => ({ chunk, score: cosineSimilarity(chunk.embedding, queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  const strongMatches = scored.filter((s) => s.score >= HIGH_THRESHOLD).length;
  const retrievedSections = Array.from(new Set(scored.map((s) => s.chunk.section)));

  const context: ContextChunk[] = scored.map((s, i) => ({
    index: i + 1,
    text: s.chunk.text,
    page: s.chunk.page,
    section: s.chunk.section,
  }));

  const answer = await askModel(question, context);

  // Confidence describes trust in an answer, not in retrieval geometry. A
  // question can retrieve well-matched chunks and still get refused by the
  // model (weak connection between the chunks and what was actually asked),
  // so a refusal is always Low confidence with no citations, regardless of
  // how strong the underlying retrieval scores were.
  if (answer.trim() === FALLBACK) {
    return {
      answer,
      citations: [],
      confidence: 'Low',
      explanation: explainRetrieval(scored.length, strongMatches, retrievedSections, true),
    };
  }

  const citations: Citation[] = context.map((c) => ({
    id: c.index,
    page: c.page,
    section: c.section,
    // Trim to the last whole word within the limit rather than cutting
    // mid-word, so an excerpt never ends on a fragment like "manufactur".
    excerpt: c.text.slice(0, 200).replace(/\s+\S*$/, ''),
  }));

  return {
    answer,
    citations,
    confidence: confidenceLabel(scored.map((s) => s.score)),
    explanation: explainRetrieval(scored.length, strongMatches, retrievedSections, false),
  };
}
