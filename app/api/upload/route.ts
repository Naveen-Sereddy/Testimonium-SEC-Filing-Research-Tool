import { NextRequest, NextResponse } from 'next/server';
import { processUploads, NoNarrativeSectionsError, InvalidFilingPairError, isLikelyAnnualReport, type UploadInput, type UploadProgress, type UploadResult } from '@/lib/rag';
import { checkUploadRateLimit } from '@/lib/ratelimit';

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 2;

export const runtime = 'nodejs';

class UploadError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

function responseForError(error: unknown) {
  if (error instanceof UploadError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof NoNarrativeSectionsError) return NextResponse.json({ error: 'No supported 10-K sections or primary financial statements were detected in this document' }, { status: 422 });
  if (error instanceof InvalidFilingPairError) return NextResponse.json({ error: error.message }, { status: 422 });
  console.error('Upload processing failed:', error);
  return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
}

async function upload(req: NextRequest, onProgress?: (progress: UploadProgress) => void): Promise<UploadResult> {
  const formData = await req.formData();
  const files = formData.getAll('files').filter((value): value is File => value instanceof File);
  const legacyFile = formData.get('file');
  if (files.length === 0 && legacyFile instanceof File) files.push(legacyFile);
  if (files.length === 0) throw new UploadError('No file provided');
  if (files.length > MAX_FILES) throw new UploadError('Compare up to two annual filings at a time');
  if (files.some((file) => file.type !== 'application/pdf')) throw new UploadError('This prototype currently supports SEC 10-K annual reports as PDF files. Please upload a supported filing.');
  if (files.reduce((total, file) => total + file.size, 0) > MAX_BYTES) throw new UploadError('Combined upload exceeds the 50MB limit. Choose smaller files or remove one filing.');

  const inputs: UploadInput[] = [];
  for (const [index, file] of files.entries()) {
    onProgress?.({ stage: 'Extracting text', completed: index, total: files.length });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') throw new UploadError(`${file.name} is not a valid PDF file`, 422);
    const { extractPages } = await import('@/lib/pdf');
    const pages = await extractPages(buffer);
    if (!isLikelyAnnualReport(pages)) throw new UploadError(`${file.name} does not appear to be a Form 10-K annual report`, 422);
    inputs.push({ buffer, fileName: file.name, pages });
  }
  return processUploads(inputs, { onProgress });
}

export async function POST(req: NextRequest) {
  const { limited } = await checkUploadRateLimit(req);
  if (limited) return NextResponse.json({ error: 'Too many uploads, please wait a minute and try again' }, { status: 429 });
  if (!req.headers.get('accept')?.includes('text/event-stream')) {
    try { return NextResponse.json(await upload(req)); } catch (error) { return responseForError(error); }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      try {
        const result = await upload(req, (progress) => send({ type: 'progress', progress }));
        send({ type: 'complete', result });
      } catch (error) {
        const response = responseForError(error);
        send({ type: 'error', error: (await response.json()).error, status: response.status });
      } finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
}
