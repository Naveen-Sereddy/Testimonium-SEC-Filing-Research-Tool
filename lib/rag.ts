import { extractPages } from './pdf';
import { chunkPages, type Chunk, type RawPage, type TableMetadata } from './chunk';
import { sectionsForPages, tagAndFilterChunks, TABLE_SECTION } from './sections';
import { embedTexts } from './embeddings';
import { askModel, askModelStream, FALLBACK, type ContextChunk } from './chat';
import { addChunks, getAllChunks, getSessionDocuments, setSessionDocuments, type SessionDocument, type StoredChunk } from './store';
import { cosineSimilarity } from './similarity';
import { extractFilingMetadata } from './metadata';
import { extractFinancialTableChunks } from './tables';
import { confidenceLabel, DEFAULT_CONFIDENCE_PROFILE, type Confidence } from './confidence';
import { citedIds } from './parseCitations';
export type { Confidence } from './confidence';

export class NoNarrativeSectionsError extends Error {}
export class InvalidFilingPairError extends Error {}

export interface UploadResult {
  sessionId: string;
  chunkCount: number;
  pageCount: number;
  indexedSections: string[];
  company: string | null;
  fiscalYearEnd: string | null;
  documents?: SessionDocument[];
}

export interface UploadInput {
  buffer: Buffer;
  fileName: string;
  pages?: RawPage[];
}

export interface UploadProgress {
  stage: 'Extracting text' | 'Chunking' | 'Indexing';
  completed: number;
  total: number;
}

export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
}

export interface DocumentUploadResult extends SessionDocument {
  chunkCount: number;
}

export function isLikelyAnnualReport(pages: Array<{ text: string }>): boolean {
  return pages.slice(0, 3).some((page) => /\bform\s*10-k\b/i.test(page.text));
}

export async function processUploads(inputs: UploadInput[], options: UploadOptions = {}): Promise<UploadResult> {
  if (inputs.length === 0) throw new Error('At least one filing is required');
  if (inputs.length > 2) throw new Error('At most two filings can be processed together');

  const sessionId = crypto.randomUUID();
  const allStored: StoredChunk[] = [];
  const documents: DocumentUploadResult[] = [];
  const prepared: Array<{ document: DocumentUploadResult; chunks: Array<Chunk & { section: string }> }> = [];

  for (const [index, input] of inputs.entries()) {
    options.onProgress?.({ stage: 'Extracting text', completed: index, total: inputs.length });
    const pages = input.pages ?? (await extractPages(input.buffer));
    options.onProgress?.({ stage: 'Extracting text', completed: index + 1, total: inputs.length });
    options.onProgress?.({ stage: 'Chunking', completed: index, total: inputs.length });
    const sectionMap = sectionsForPages(pages);
    const rawChunks = chunkPages(pages, 1000, 200);
    const prose = tagAndFilterChunks(rawChunks, sectionMap);
    const tableChunks = extractFinancialTableChunks(pages, sectionMap).map((chunk) => ({
      ...chunk,
      section: TABLE_SECTION,
    }));
    const filtered = [...prose, ...tableChunks];

    if (filtered.length === 0) {
      throw new NoNarrativeSectionsError(`No supported narrative or financial statement sections detected in ${input.fileName}`);
    }

    const { company, fiscalYearEnd } = extractFilingMetadata(pages);
    const filingYearMatch = fiscalYearEnd?.match(/\b(19|20)\d{2}\b/);
    const document: DocumentUploadResult = {
      id: `filing-${index + 1}`,
      fileName: input.fileName,
      company,
      fiscalYearEnd,
      filingYear: filingYearMatch ? Number(filingYearMatch[0]) : null,
      pageCount: pages.length,
      indexedSections: Array.from(new Set(filtered.map((c) => c.section))),
      chunkCount: filtered.length,
    };
    documents.push(document);
    prepared.push({ document, chunks: filtered });
    options.onProgress?.({ stage: 'Chunking', completed: index + 1, total: inputs.length });
  }

  if (documents.length === 2) {
    const [left, right] = documents;
    const normalizedCompany = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (left.company && right.company && normalizedCompany(left.company) !== normalizedCompany(right.company)) {
      throw new InvalidFilingPairError('The two filings appear to belong to different companies');
    }
    if (left.filingYear && right.filingYear && left.filingYear === right.filingYear) {
      throw new InvalidFilingPairError('Choose filings from two different fiscal years');
    }
  }

  const totalChunks = prepared.reduce((sum, entry) => sum + entry.chunks.length, 0);
  let indexedChunks = 0;
  for (const { document, chunks } of prepared) {
    const embeddings: number[][] = [];
    // Gemini accepts 100 inputs per embedding request. Keep progress truthful
    // at that granularity while avoiding unnecessary network round trips for
    // the bundled sample filing and ordinary uploads.
    const batchSize = 100;
    options.onProgress?.({ stage: 'Indexing', completed: indexedChunks, total: totalChunks });
    for (let start = 0; start < chunks.length; start += batchSize) {
      const batch = chunks.slice(start, start + batchSize);
      embeddings.push(...await embedTexts(batch.map((chunk) => chunk.text)));
      indexedChunks += batch.length;
      options.onProgress?.({ stage: 'Indexing', completed: indexedChunks, total: totalChunks });
    }
    allStored.push(
      ...chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
        documentId: document.id,
      })),
    );
  }

  await addChunks(sessionId, allStored);
  await setSessionDocuments(sessionId, documents);

  const first = documents[0];
  return {
    sessionId,
    chunkCount: documents.reduce((sum, document) => sum + document.chunkCount, 0),
    pageCount: documents.reduce((sum, document) => sum + document.pageCount, 0),
    indexedSections: Array.from(new Set(documents.flatMap((document) => document.indexedSections))),
    company: first.company,
    fiscalYearEnd: first.fiscalYearEnd,
    documents,
  };
}

export async function processUpload(buffer: Buffer): Promise<UploadResult> {
  return processUploads([{ buffer, fileName: 'uploaded-filing.pdf' }]);
}

export interface Citation {
  id: number;
  chunkId?: string;
  page: number;
  section: string;
  excerpt: string;
  documentId?: string;
  fileName?: string;
  filingYear?: number | null;
  company?: string | null;
  kind?: 'prose' | 'table';
  table?: TableMetadata;
  /** Exact source strings visually emphasized in the evidence UI. */
  highlights?: string[];
}

export interface QueryResult {
  answer: string;
  citations: Citation[];
  confidence: Confidence;
  explanation: string;
}

export interface ConversationTurn {
  question: string;
  answer?: string;
}

export { confidenceLabel };
const HIGH_THRESHOLD = DEFAULT_CONFIDENCE_PROFILE.highThreshold;
const HIGH_MIN_COUNT = DEFAULT_CONFIDENCE_PROFILE.highMinCount;

function normalizedAnswer(answer: string): string {
  return answer.trim().replace(/^['\"]|['\"]$/g, '').replace(/\s+/g, ' ').toLowerCase();
}

export function isRefusalAnswer(answer: string): boolean {
  return normalizedAnswer(answer).startsWith(FALLBACK.toLowerCase());
}

export function requestedSection(question: string): string | null {
  if (/\b(?:item\s*1a|risk factors?)\b/i.test(question)) return 'Risk Factors';
  if (/\b(?:item\s*7|md&a|management(?:'|’)?s discussion and analysis)\b/i.test(question)) return 'MD&A';
  if (/\b(?:item\s*3|legal proceedings?|litigation)\b/i.test(question)) return 'Legal Proceedings';
  if (/\b(?:item\s*8|financial statements?|income statement|balance sheet|cash flows? statement)\b/i.test(question)) return TABLE_SECTION;
  return null;
}

export function isUnsupportedQuery(question: string): boolean {
  return (
    /\b(?:should|would)\s+i\b.{0,40}\b(?:buy|sell|invest|hold)\b/i.test(question) ||
    /\b(?:stock|share)\s+price\b.{0,24}\b(?:today|current|now|latest)\b/i.test(question) ||
    /\b(?:private|personal)\s+(?:phone|email|address)\b/i.test(question) ||
    /\b(?:today|yesterday|right now|latest)\b.{0,40}\b(?:social media|tweet|posted)\b/i.test(question)
  );
}

/** Reject keyboard mashing before it consumes a retrieval request. */
export function isLowInformationQuery(question: string): boolean {
  const normalized = question.trim().toLowerCase();
  if (normalized.length < 3) return true;
  const words = normalized.match(/[a-z]{2,}/g) ?? [];
  if (words.length === 0) return true;
  const keyboardMash = /\b(?:asdf(?:gh)?|qwerty(?:uiop)?|zxcv(?:bnm)?|poiuy|lkjh)\b/;
  return keyboardMash.test(normalized) || (words.length >= 3 && words.every((word) => !/[aeiou]/.test(word)));
}

/**
 * Follow-up questions such as “And in 2022?” do not contain enough retrieval
 * terms by themselves. Expand them with the immediately preceding question,
 * while keeping the original text available to the model as a conversation
 * reference. This is deliberately deterministic: it never invents a topic.
 */
export function expandFollowUp(question: string, history: ConversationTurn[]): { retrievalQuery: string; reference?: string } {
  const prior = history.at(-1);
  const needsContext = /^(?:and\b|what about\b|how about\b|then\b|that\b|it\b|this\b)/i.test(question.trim()) || question.trim().split(/\s+/).length <= 5;
  if (!prior || !needsContext) return { retrievalQuery: question };
  return {
    retrievalQuery: `${prior.question} Follow-up: ${question}`,
    reference: `Previous question: ${prior.question}${prior.answer ? ` Previous answer: ${prior.answer}` : ''}`,
  };
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

const NUMBER_CLAIM = /\$?\s*\(?\d[\d,]*(?:\.\d+)?\)?\s*(?:thousand|million|billion|[KMB])?/gi;

function numericClaims(text: string): string[] {
  return (text.replace(/\[\d+\]/g, '').match(NUMBER_CLAIM) ?? [])
    .map((claim) => claim.trim())
    .filter((claim) => /\d/.test(claim));
}

function amountInDollars(value: string, inheritedUnit?: string): number | null {
  const numeric = Number(value.replace(/[$,()\s]/g, '').replace(/(?:thousand|million|billion|[kmb])$/i, ''));
  if (!Number.isFinite(numeric)) return null;
  const explicit = /(?:thousand|million|billion|[kmb])\s*$/i.exec(value)?.[0].toLowerCase();
  const unit = explicit ?? inheritedUnit?.match(/thousands|millions|billions/i)?.[0].toLowerCase();
  const multiplier = unit?.startsWith('thousand') || unit === 'k' ? 1_000
    : unit?.startsWith('million') || unit === 'm' ? 1_000_000
      : unit?.startsWith('billion') || unit === 'b' ? 1_000_000_000 : 1;
  return numeric * multiplier;
}

function supportingClaims(source: string, answer: string, unitScale?: string): string[] {
  const sourceClaims = numericClaims(source);
  const allAnswerClaims = numericClaims(answer);
  // A citation attached to a monetary statement must substantiate the money,
  // not merely the year mentioned in the same sentence.
  const moneyClaims = allAnswerClaims.filter((claim) => /[$]|\b(?:thousand|million|billion|[kmb])\b/i.test(claim));
  const answerClaims = moneyClaims.length > 0 ? moneyClaims : allAnswerClaims;
  const highlights: string[] = [];
  for (const claim of answerClaims) {
    const rawDigits = (value: string) => value.replace(/[^\d.]/g, '');
    const direct = sourceClaims.find((sourceClaim) => rawDigits(sourceClaim) === rawDigits(claim));
    const sourceMatch = direct ?? sourceClaims.find((sourceClaim) => {
      const sourceAmount = amountInDollars(sourceClaim, unitScale);
      const answerAmount = amountInDollars(claim);
      return sourceAmount !== null && answerAmount !== null && Math.abs(sourceAmount - answerAmount) / Math.max(1, Math.abs(answerAmount)) < 0.002;
    });
    if (sourceMatch) highlights.push(sourceMatch);
  }
  return Array.from(new Set(highlights));
}

function hasNumericClaim(answer: string): boolean {
  return numericClaims(answer).length > 0;
}

function excerptForClaim(citation: Citation, answer: string): Citation {
  if (!hasNumericClaim(answer)) {
    return { id: citation.id, chunkId: citation.chunkId, page: citation.page, section: citation.section, excerpt: citation.excerpt.slice(0, 200).replace(/\s+\S*$/, '') };
  }
  const highlights = supportingClaims(citation.excerpt, answer, citation.table?.unitScale);
  if (highlights.length === 0) return { ...citation, highlights: [] };
  const first = citation.excerpt.toLowerCase().indexOf(highlights[0].toLowerCase());
  const start = Math.max(0, first - 180);
  const end = Math.min(citation.excerpt.length, first + highlights[0].length + 420);
  const excerpt = `${start > 0 ? '…' : ''}${citation.excerpt.slice(start, end).trim()}${end < citation.excerpt.length ? '…' : ''}`;
  return { ...citation, excerpt, highlights };
}

function excerptSupportsNumericClaim(source: string, answer: string, unitScale?: string): boolean {
  return supportingClaims(source, answer, unitScale).length > 0;
}

/** Return the sentence or list item immediately supported by an inline [N]. */
function claimForCitation(answer: string, citationId: number): string {
  const token = new RegExp(`\\[${citationId}\\]`, 'g');
  const match = token.exec(answer);
  if (!match) return answer;
  const before = answer.slice(0, match.index).replace(/[.!?]\s*$/, '');
  const boundaries = Array.from(before.matchAll(/[.!?](?:\s|$)|\n|;|:/g));
  const boundary = boundaries.at(-1)?.index ?? -1;
  return before.slice(boundary + 1).trim();
}

export async function answerQuestion(sessionId: string, question: string, k = 5, history: ConversationTurn[] = [], onToken?: (token: string) => void): Promise<QueryResult> {
  const all = await getAllChunks(sessionId);
  const documents = await getSessionDocuments(sessionId);
  const documentsById = new Map(documents.map((document) => [document.id, document]));

  if (all.length === 0) {
    return { answer: FALLBACK, citations: [], confidence: 'Low', explanation: explainRetrieval(0, 0, [], true) };
  }

  if (isLowInformationQuery(question)) {
    return {
      answer: "I didn't understand that. Try asking about figures, sections, or events in the filing.",
      citations: [],
      confidence: 'Low',
      explanation: 'The question did not contain enough information to search the filing reliably.',
    };
  }

  const targetSection = requestedSection(question);
  const indexedSections = new Set(all.map((chunk) => chunk.section));
  if (isUnsupportedQuery(question) || (targetSection !== null && !indexedSections.has(targetSection))) {
    return {
      answer: FALLBACK,
      citations: [],
      confidence: 'Low',
      explanation: targetSection && !indexedSections.has(targetSection)
        ? `${targetSection} was not available in the indexed filing content.`
        : 'This question requires information or advice outside the uploaded filing evidence.',
    };
  }

  const followUp = expandFollowUp(question, history);
  const [queryEmbedding] = await embedTexts([followUp.retrievalQuery]);
  const scored = all
    .map((chunk) => ({ chunk, score: cosineSimilarity(chunk.embedding, queryEmbedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  const strongMatches = scored.filter((s) => s.score >= HIGH_THRESHOLD).length;
  const retrievedSections = Array.from(new Set(scored.map((s) => s.chunk.section)));

  const context: ContextChunk[] = scored.map((s, i) => ({
    index: i + 1,
    chunkId: s.chunk.id,
    text: s.chunk.text,
    page: s.chunk.page,
    section: s.chunk.section,
    documentId: s.chunk.documentId,
    fileName: s.chunk.documentId ? documentsById.get(s.chunk.documentId)?.fileName : undefined,
    filingYear: s.chunk.documentId ? documentsById.get(s.chunk.documentId)?.filingYear : undefined,
    kind: s.chunk.kind,
    table: s.chunk.table,
  }));

  const answer = onToken
    ? await askModelStream(question, context, onToken, followUp.reference)
    : await askModel(question, context, followUp.reference);

  // Confidence describes trust in an answer, not in retrieval geometry. A
  // question can retrieve well-matched chunks and still get refused by the
  // model (weak connection between the chunks and what was actually asked),
  // so a refusal is always Low confidence with no citations, regardless of
  // how strong the underlying retrieval scores were.
  if (isRefusalAnswer(answer)) {
    return {
      answer,
      citations: [],
      confidence: 'Low',
      explanation: explainRetrieval(scored.length, strongMatches, retrievedSections, true),
    };
  }

  const candidateCitations: Citation[] = context.map((c) => ({
    id: c.index,
    chunkId: c.chunkId,
    page: c.page,
    section: c.section,
    // Trim to the last whole word within the limit rather than cutting
    // mid-word, so an excerpt never ends on a fragment like "manufactur".
    excerpt: c.text,
    ...(c.documentId ? { documentId: c.documentId } : {}),
    ...(c.fileName ? { fileName: c.fileName } : {}),
    ...(c.filingYear ? { filingYear: c.filingYear } : {}),
    ...(c.documentId && documentsById.get(c.documentId)?.company ? { company: documentsById.get(c.documentId)?.company } : {}),
    ...(c.kind ? { kind: c.kind } : {}),
    ...(c.table ? { table: c.table } : {}),
  }));

  const resolved = citedIds(answer, candidateCitations);
  if (resolved.ids.length === 0 || resolved.invalidTokens.length > 0) {
    return {
      answer: FALLBACK,
      citations: [],
      confidence: 'Low',
      explanation: 'The generated response did not provide a complete, verifiable citation mapping, so it was withheld.',
    };
  }

  const citedIdSet = new Set(resolved.ids);
  const citations = candidateCitations
    .filter((citation) => citedIdSet.has(citation.id))
    .map((citation) => ({ citation: excerptForClaim(citation, claimForCitation(answer, citation.id)), claim: claimForCitation(answer, citation.id) }))
    // A numeric claim without the number in the retrieved source is not
    // evidence. Withhold that source rather than attaching a decorative link.
    .filter(({ citation, claim }) => !hasNumericClaim(claim) || excerptSupportsNumericClaim(citation.excerpt, claim, citation.table?.unitScale))
    .map(({ citation }) => citation);
  if (citations.length === 0) {
    return {
      answer: FALLBACK,
      citations: [],
      confidence: 'Low',
      explanation: 'The generated numeric claim could not be tied to a supporting passage, so it was withheld.',
    };
  }
  const retainedIds = new Set(citations.map((citation) => citation.id));
  const verifiedAnswer = answer
    .replace(/\[(\d+)\]/g, (token, id: string) => retainedIds.has(Number(id)) ? token : '')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const citedScores = citations.map((citation) => scored[citation.id - 1]?.score).filter((score): score is number => score !== undefined);
  const citedStrongMatches = citedScores.filter((score) => score >= HIGH_THRESHOLD).length;
  const citedSections = Array.from(new Set(citations.map((citation) => citation.section)));

  return {
    answer: verifiedAnswer,
    citations,
    confidence: citedStrongMatches > 0 ? confidenceLabel(citedScores) : 'Low',
    explanation: explainRetrieval(citations.length, citedStrongMatches, citedSections, false),
  };
}
