import { NextRequest, NextResponse } from 'next/server';
import { NoNarrativeSectionsError, InvalidFilingPairError, type UploadProgress, type UploadResult } from '@/lib/rag';
import { checkUploadRateLimit } from '@/lib/ratelimit';
import { processUploadedFiles, UploadError } from '@/lib/uploadProcessing';

export const runtime = 'nodejs';

export function responseForUploadError(error: unknown) {
  if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof NoNarrativeSectionsError) return NextResponse.json({ error: 'No supported 10-K sections or primary financial statements were detected in this document' }, { status: 422 });
  if (error instanceof InvalidFilingPairError) return NextResponse.json({ error: error.message }, { status: 422 });
  console.error('Upload processing failed:', error);
  return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
}

export async function upload(req: NextRequest, onProgress?: (progress: UploadProgress) => void): Promise<UploadResult> {
  const formData = await req.formData();
  const files = formData.getAll('files').filter((value): value is File => value instanceof File);
  const legacyFile = formData.get('file');
  if (files.length === 0 && legacyFile instanceof File) files.push(legacyFile);
  return processUploadedFiles(await Promise.all(files.map(async (file) => ({ fileName: file.name, type: file.type, size: file.size, buffer: Buffer.from(await file.arrayBuffer()) }))), onProgress);
}

export async function POST(req: NextRequest) {
  const { limited } = await checkUploadRateLimit(req);
  if (limited) return NextResponse.json({ error: 'Too many uploads, please wait a minute and try again' }, { status: 429 });
  if (!req.headers.get('accept')?.includes('text/event-stream')) {
    try { return NextResponse.json(await upload(req)); } catch (error) { return responseForUploadError(error); }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      try {
        const result = await upload(req, (progress) => send({ type: 'progress', progress }));
        send({ type: 'complete', result });
      } catch (error) {
        const response = responseForUploadError(error);
        send({ type: 'error', error: (await response.json()).error, status: response.status });
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
}
