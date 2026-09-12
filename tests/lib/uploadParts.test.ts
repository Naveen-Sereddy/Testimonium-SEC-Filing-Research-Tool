import { describe, expect, it } from 'vitest';
import { UPLOAD_PART_BYTES, consumeUploadParts, saveUploadPart } from '../../lib/uploadParts';

describe('pending upload parts', () => {
  it('reassembles a multipart PDF in order', async () => {
    const uploadId = crypto.randomUUID();
    const bytes = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(UPLOAD_PART_BYTES), Buffer.from('EOF')]);
    const descriptor = { uploadId, fileName: 'large-filing.pdf', contentType: 'application/pdf', size: bytes.length, totalParts: 2 } as const;

    await saveUploadPart(descriptor, 0, bytes.subarray(0, UPLOAD_PART_BYTES));
    await saveUploadPart(descriptor, 1, bytes.subarray(UPLOAD_PART_BYTES));

    await expect(consumeUploadParts(descriptor)).resolves.toEqual(bytes);
  });
});
