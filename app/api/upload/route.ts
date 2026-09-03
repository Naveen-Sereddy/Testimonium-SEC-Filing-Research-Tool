import { NextRequest, NextResponse } from 'next/server';
import { processUploads, NoNarrativeSectionsError, InvalidFilingPairError, isLikelyAnnualReport, type UploadInput } from '@/lib/rag';
import { checkUploadRateLimit } from '@/lib/ratelimit';

// Vercel Functions hard-cap request bodies at 4.5MB (platform limit, not
// configurable). Staying under that with margin, rather than advertising a
// limit the platform would reject before this code ever runs.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_FILES = 2;

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { limited } = await checkUploadRateLimit(req);
  if (limited) {
    return NextResponse.json({ error: 'Too many uploads, please wait a minute and try again' }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll('files').filter((value): value is File => value instanceof File);
    const legacyFile = formData.get('file');
    if (files.length === 0 && legacyFile instanceof File) files.push(legacyFile);

    if (files.length === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: 'Compare up to two annual filings at a time' }, { status: 400 });
    }
    if (files.some((file) => file.type !== 'application/pdf')) {
      return NextResponse.json(
        { error: 'This prototype currently supports SEC 10-K annual reports as PDF files. Please upload a supported filing.' },
        { status: 400 },
      );
    }
    if (files.reduce((total, file) => total + file.size, 0) > MAX_BYTES) {
      return NextResponse.json({ error: 'Combined upload exceeds the 4MB deployment limit' }, { status: 400 });
    }

    const inputs: UploadInput[] = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      if (buffer.subarray(0, 5).toString('ascii') !== '%PDF-') {
        return NextResponse.json({ error: `${file.name} is not a valid PDF file` }, { status: 422 });
      }
      const { extractPages } = await import('@/lib/pdf');
      const pages = await extractPages(buffer);
      if (!isLikelyAnnualReport(pages)) {
        return NextResponse.json({ error: `${file.name} does not appear to be a Form 10-K annual report` }, { status: 422 });
      }
      inputs.push({ buffer, fileName: file.name, pages });
    }

    const result = await processUploads(inputs);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoNarrativeSectionsError) {
      return NextResponse.json(
        { error: 'No supported 10-K sections or primary financial statements were detected in this document' },
        { status: 422 },
      );
    }
    if (err instanceof InvalidFilingPairError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    console.error('Upload processing failed:', err);
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 });
  }
}
