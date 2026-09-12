import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion, type ConversationTurn } from '@/lib/rag';
import { checkQueryRateLimit } from '@/lib/ratelimit';
import { isValidSessionId } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

  let body: { question?: unknown; sessionId?: unknown; citationDepth?: unknown; history?: unknown } | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  const citationDepth = body?.citationDepth;
  const k = isCitationDepth(citationDepth) ? CITATION_DEPTH_TO_K[citationDepth] : CITATION_DEPTH_TO_K.standard;
  const history: ConversationTurn[] = Array.isArray(body?.history)
    ? body.history.slice(-3).flatMap((turn) => typeof turn === 'object' && turn !== null && typeof (turn as ConversationTurn).question === 'string'
      ? [{ question: (turn as ConversationTurn).question, answer: typeof (turn as ConversationTurn).answer === 'string' ? (turn as ConversationTurn).answer : undefined }]
      : [])
    : [];

  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }
  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: 'No document session, please upload a document first' }, { status: 400 });
  }

  try {
    if (req.headers.get('accept')?.includes('text/event-stream')) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          // Flush an SSE frame immediately. This prevents proxy buffering from
          // hiding token events until the model has completed its answer.
          controller.enqueue(encoder.encode(': connected\n\n'));
          try {
            const result = await answerQuestion(sessionId, question, k, history, (token) => send({ type: 'token', token }));
            send({ type: 'complete', result });
          } catch (error) {
            console.error('Query processing failed:', error);
            send({ type: 'error', error: 'Failed to process question' });
          } finally { controller.close(); }
        },
      });
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no', 'Content-Encoding': 'none' } });
    }
    const result = await answerQuestion(sessionId, question, k, history);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Query processing failed:', err);
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 });
  }
}
