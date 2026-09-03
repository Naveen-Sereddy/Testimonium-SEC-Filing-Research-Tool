import { NextRequest, NextResponse } from 'next/server';
import { compareSessionFilings } from '@/lib/compare';
import { checkQueryRateLimit } from '@/lib/ratelimit';
import { isValidSessionId } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { limited } = await checkQueryRateLimit(req);
  if (limited) return NextResponse.json({ error: 'Too many requests, please wait a minute and try again' }, { status: 429 });

  let body: { sessionId?: unknown } | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';
  if (!isValidSessionId(sessionId)) return NextResponse.json({ error: 'No valid document session, please upload filings first' }, { status: 400 });

  try {
    const comparison = await compareSessionFilings(sessionId);
    if (!comparison) return NextResponse.json({ error: 'Upload two annual filings to compare them' }, { status: 422 });
    return NextResponse.json(comparison);
  } catch (err) {
    console.error('Filing comparison failed:', err);
    return NextResponse.json({ error: 'Failed to compare filings' }, { status: 500 });
  }
}
