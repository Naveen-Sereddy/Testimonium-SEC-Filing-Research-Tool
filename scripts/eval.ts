/**
 * Retrieval and refusal-behavior eval, run against a real deployment over HTTP.
 *
 * What this checks, honestly:
 *  - In-scope questions get answered (not refused), with real citations.
 *  - Out-of-scope questions (info the document doesn't contain) get correctly
 *    refused: Low confidence, zero citations. This is the exact behavior the
 *    confidence/refusal decoupling fix (commit 6cfd96c) put in place.
 *  - Citation Depth actually changes retrieval count (3/5/8), not decorative.
 *  - Every returned citation page number falls inside the real PDF page range.
 *
 * What this does NOT check:
 *  - Whether the generated prose is a *good* summary (needs a human or LLM
 *    judge, not implemented here).
 *  - Anything beyond this one bundled demo document. This is not a
 *    representative corpus, and confidence thresholds (0.85/0.6) are still
 *    hand-picked, not statistically calibrated against this eval. This
 *    script validates behavior, not the thresholds themselves.
 *
 * Usage:
 *   npm run eval                                  # against production
 *   BASE_URL=http://localhost:3000 npm run eval    # against local dev
 */

import { readFile } from 'fs/promises';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'https://testimonium.vercel.app';
const DEMO_PDF = path.resolve(__dirname, '../public/demo/sample-10k.pdf');

interface GoldenCase {
  question: string;
  shouldAnswer: boolean;
  expectedSections: string[];
  note: string;
}

const GOLDEN_SET: GoldenCase[] = [
  {
    question: 'What are the top risk factors mentioned in this document?',
    shouldAnswer: true,
    expectedSections: ['Risk Factors'],
    note: 'Core risk-factors content, present in every observed run this build',
  },
  {
    question: "Summarize the risks related to the company's intellectual property",
    shouldAnswer: true,
    expectedSections: ['Risk Factors'],
    note: 'Narrower risk-factors sub-topic',
  },
  {
    question: "What is the company's accumulated deficit?",
    shouldAnswer: true,
    expectedSections: ['Risk Factors'],
    note: 'Specific figure from the financial-condition risk factor',
  },
  {
    question: 'What is this document about?',
    shouldAnswer: true,
    expectedSections: ['Risk Factors', 'MD&A', 'Legal Proceedings'],
    note: 'Broad meta-question, not a keyword match to any single passage',
  },
  {
    question: "What was the CEO's total compensation last year?",
    shouldAnswer: false,
    expectedSections: [],
    note: 'Not in narrative sections (compensation tables are excluded by design)',
  },
  {
    question: "What color is the company's logo?",
    shouldAnswer: false,
    expectedSections: [],
    note: 'Not the kind of fact a 10-K narrative section contains at all',
  },
];

interface QueryResult {
  answer: string;
  citations: { page: number; section: string }[];
  confidence: 'High' | 'Medium' | 'Low';
}

async function upload(): Promise<{ sessionId: string; pageCount: number }> {
  const bytes = await readFile(DEMO_PDF);
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'application/pdf' }), 'sample-10k.pdf');
  const res = await fetch(`${BASE_URL}/api/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function query(question: string, sessionId: string, citationDepth = 'standard'): Promise<QueryResult> {
  const res = await fetch(`${BASE_URL}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, sessionId, citationDepth }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const FALLBACK = "I don't know based on the provided document.";

async function main() {
  console.log(`Eval target: ${BASE_URL}\n`);
  console.log('Uploading demo document...');
  const { sessionId, pageCount } = await upload();
  console.log(`Session ${sessionId}, ${pageCount} pages\n`);

  let passed = 0;
  let citationCount = 0;
  let validCitationPages = 0;
  let sectionMatches = 0;
  let sectionCitations = 0;
  let correctRefusals = 0;
  let refusalCases = 0;
  const rows: string[] = [];

  for (const c of GOLDEN_SET) {
    const result = await query(c.question, sessionId);
    const refused = result.answer.trim() === FALLBACK;
    const answered = !refused;
    const behaviorCorrect = answered === c.shouldAnswer;
    const refusalConsistent = !refused || (result.confidence === 'Low' && result.citations.length === 0);
    const pagesInRange = result.citations.every((cit) => cit.page >= 1 && cit.page <= pageCount);
    const pass = behaviorCorrect && refusalConsistent && pagesInRange;
    if (pass) passed++;
    citationCount += result.citations.length;
    validCitationPages += result.citations.filter((citation) => citation.page >= 1 && citation.page <= pageCount).length;
    if (c.shouldAnswer) {
      sectionCitations += result.citations.length;
      sectionMatches += result.citations.filter((citation) => c.expectedSections.includes(citation.section)).length;
    } else {
      refusalCases += 1;
      if (refused && refusalConsistent) correctRefusals += 1;
    }

    rows.push(
      [
        pass ? 'PASS' : 'FAIL',
        `expected=${c.shouldAnswer ? 'answer' : 'refuse'}`,
        `got=${answered ? 'answer' : 'refuse'}`,
        `confidence=${result.confidence}`,
        `citations=${result.citations.length}`,
        pagesInRange ? 'pages-ok' : 'PAGE-OUT-OF-RANGE',
        `— ${c.question}`,
      ].join('  '),
    );
  }

  console.log(rows.join('\n'));
  console.log(`\n${passed}/${GOLDEN_SET.length} passed\n`);
  console.log('Observed smoke metrics:');
  console.log(`  Retrieval section precision: ${sectionMatches}/${sectionCitations}`);
  console.log(`  Citation page validity: ${validCitationPages}/${citationCount}`);
  console.log(`  Refusal accuracy: ${correctRefusals}/${refusalCases}\n`);

  console.log('Citation Depth check (same question, k=3/5/8):');
  const depths: Array<'brief' | 'standard' | 'detailed'> = ['brief', 'standard', 'detailed'];
  const depthResults = await Promise.all(
    depths.map((d) => query('What are the top risk factors mentioned in this document?', sessionId, d)),
  );
  depths.forEach((d, i) => console.log(`  ${d}: ${depthResults[i].citations.length} citations`));
  const depthWorks = depthResults[0].citations.length < depthResults[1].citations.length &&
    depthResults[1].citations.length < depthResults[2].citations.length;
  console.log(depthWorks ? '  PASS: citation count increases with depth\n' : '  FAIL: depth does not change citation count\n');

  await fetch(`${BASE_URL}/api/session`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  }).catch((error) => console.error('Session cleanup failed:', error));

  const allPass = passed === GOLDEN_SET.length && depthWorks;
  if (!allPass) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
