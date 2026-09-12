import { NextRequest, NextResponse } from 'next/server';
import { UPLOAD_PART_BYTES, saveUploadPart, type UploadPartDescriptor } from '@/lib/uploadParts';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('part');
    const descriptor: UploadPartDescriptor = {
      uploadId: String(formData.get('uploadId') ?? ''),
      fileName: String(formData.get('fileName') ?? ''),
      contentType: String(formData.get('contentType') ?? ''),
      size: Number(formData.get('size')),
      totalParts: Number(formData.get('totalParts')),
    };
    const index = Number(formData.get('index'));
    if (!(file instanceof File)) return NextResponse.json({ error: 'No upload part provided' }, { status: 400 });
    if (file.size > UPLOAD_PART_BYTES) return NextResponse.json({ error: 'Each upload part must be 3MB or smaller' }, { status: 413 });
    await saveUploadPart(descriptor, index, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ received: index });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not store upload part' }, { status: 400 });
  }
}
