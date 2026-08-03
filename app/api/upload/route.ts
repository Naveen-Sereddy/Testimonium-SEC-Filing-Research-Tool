import { NextRequest, NextResponse } from 'next/server';
import { processUpload, NoNarrativeSectionsError } from '@/lib/rag';
import { checkUploadRateLimit } from '@/lib/ratelimit';

// Vercel Functions hard-cap request bodies at 4.5MB (platform limit, not
// configurable). Staying under that with margin, rather than advertising a
// limit the platform would reject before this code ever runs.
const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { limited } = await checkUploadRateLimit(req);
  if (limited) {
    return NextResponse.json({ error: 'Too many uploads, please wait a minute and try again' }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'This prototype currently supports SEC 10-K annual reports as PDF files. Please upload a supported filing.' },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 4MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await processUpload(buffer);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoNarrativeSectionsError) {
      return NextResponse.json(
        { error: 'No narrative sections (MD&A, Risk Factors, Legal Proceedings) detected in this document' },
        { status: 422 },
      );
    }
    console.error('Upload processing failed:', err);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}
