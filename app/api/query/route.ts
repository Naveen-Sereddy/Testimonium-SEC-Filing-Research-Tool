import { NextRequest, NextResponse } from 'next/server';
import { answerQuestion } from '@/lib/rag';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';

  if (!question) {
    return NextResponse.json({ error: 'Question is required' }, { status: 400 });
  }
  if (!sessionId) {
    return NextResponse.json({ error: 'No document session, please upload a document first' }, { status: 400 });
  }

  try {
    const result = await answerQuestion(sessionId, question);
    return NextResponse.json(result);
  } catch (err) {
    console.error('Query processing failed:', err);
    return NextResponse.json({ error: 'Failed to process question' }, { status: 500 });
  }
}
