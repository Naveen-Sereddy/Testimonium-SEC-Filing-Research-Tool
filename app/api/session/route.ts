import { NextRequest, NextResponse } from 'next/server';
import { resetStore } from '@/lib/store';

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : '';

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
  }

  await resetStore(sessionId);
  return NextResponse.json({ ok: true });
}
