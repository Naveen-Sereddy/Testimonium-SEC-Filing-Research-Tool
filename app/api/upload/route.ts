import { NextRequest, NextResponse } from 'next/server';
import { processUpload, NoNarrativeSectionsError } from '@/lib/rag';

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 20MB limit' }, { status: 400 });
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
