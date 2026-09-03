import { NextRequest, NextResponse } from 'next/server';
import { resetStore } from '@/lib/store';
import { isValidSessionId } from '@/lib/session';

export async function DELETE(req: NextRequest) {
  let body: { sessionId?: unknown } | null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
  }
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';

  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  try {
    await resetStore(sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Session cleanup failed:', error);
    return NextResponse.json({ error: 'Failed to clear session' }, { status: 500 });
  }
}
