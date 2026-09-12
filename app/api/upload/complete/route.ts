import { NextRequest } from 'next/server';
import { checkUploadRateLimit } from '@/lib/ratelimit';
import { clearUploadParts, consumeUploadParts, PendingUploadError, type UploadPartDescriptor } from '@/lib/uploadParts';
import { processUploadedFiles, UploadError } from '@/lib/uploadProcessing';
import { responseForUploadError } from '../route';
import type { UploadProgress } from '@/lib/rag';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { limited } = await checkUploadRateLimit(req);
  if (limited) return Response.json({ error: 'Too many uploads, please wait a minute and try again' }, { status: 429 });

  let uploads: UploadPartDescriptor[] = [];
  try {
    const body = await req.json() as { uploads?: UploadPartDescriptor[] };
    uploads = Array.isArray(body.uploads) ? body.uploads : [];
    if (uploads.length === 0 || uploads.length > 2) return Response.json({ error: 'Choose one or two PDF filings' }, { status: 400 });
  } catch {
    return Response.json({ error: 'Invalid upload request' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      try {
        const files = await Promise.all(uploads.map(async (upload) => ({
          fileName: upload.fileName,
          type: upload.contentType,
          size: upload.size,
          buffer: await consumeUploadParts(upload),
        })));
        const result = await processUploadedFiles(files, (progress: UploadProgress) => send({ type: 'progress', progress }));
        send({ type: 'complete', result });
      } catch (error) {
        const response = responseForUploadError(error instanceof PendingUploadError ? new UploadError(error.message) : error);
        send({ type: 'error', error: (await response.json()).error, status: response.status });
      } finally {
        await clearUploadParts(uploads).catch(() => undefined);
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
}
