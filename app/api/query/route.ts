import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/rag';
import { checkQueryRateLimit } from '@/lib/ratelimit';
import { isValidSessionId } from '@/lib/session';

const CITATION_DEPTH_TO_K = { brief: 3, standard: 5, detailed: 8 } as const;
type CitationDepth = keyof typeof CITATION_DEPTH_TO_K;

function isCitationDepth(v: unknown): v is CitationDepth {
  return typeof v === 'string' && v in CITATION_DEPTH_TO_K;
}

export async function POST(req: NextRequest) {
  const { limited } = await checkQueryRateLimit(req);
  if (limited) {
    return NextResponse.json({ error: 'Too many questions, please wait a minute and try again' }, { status: 429 });
  }

  let body: { question?: unknown; sessionId?: unknown; citationDepth?: unknown } | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const citationDepth = body?.citationDepth;
  const k = isCitationDepth(citationDepth) ? CITATION_DEPTH_TO_K[citationDepth] : CITATION_DEPTH_TO_K.standard;

  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: 'No document session, please upload a document first' }, { status: 400 });
  }

  try {
    const result = await answerQuestion(sessionId, question, k);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Query processing failed:', err);
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 });
  }
}
