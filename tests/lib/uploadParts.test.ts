import { describe, expect, it } from 'vitest';
import { consumeUploadParts, saveUploadPart } from '../../lib/uploadParts';

describe('pending upload parts', () => {
  it('reassembles a multipart PDF in order', async () => {
    const uploadId = crypto.randomUUID();
    const bytes = Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(8 * 1024), Buffer.from('EOF')]);
    const descriptor = { uploadId, fileName: 'large-filing.pdf', contentType: 'application/pdf', size: bytes.length, totalParts: 2 } as const;
    const midpoint = Math.ceil(bytes.length / 2);

    await saveUploadPart(descriptor, 0, bytes.subarray(0, midpoint));
    await saveUploadPart(descriptor, 1, bytes.subarray(midpoint));

    await expect(consumeUploadParts(descriptor)).resolves.toEqual(bytes);
  });
});
