const PART_TTL_SECONDS = 10 * 60;
export const UPLOAD_PART_BYTES = 3 * 1024 * 1024;

export class PendingUploadError extends Error {}

export interface UploadPartDescriptor {
  uploadId: string;
  fileName: string;
  contentType: string;
  size: number;
  totalParts: number;
}

type StoredPartUpload = UploadPartDescriptor;

const memoryMetadata = new Map<string, StoredPartUpload>();
const memoryParts = new Map<string, string>();

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvClient() {
  const { Redis } = await import('@upstash/redis');
  return new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! });
}

function metadataKey(uploadId: string): string { return `pending-upload:${uploadId}:metadata`; }
function partKey(uploadId: string, index: number): string { return `pending-upload:${uploadId}:part:${index}`; }

function validateDescriptor(descriptor: UploadPartDescriptor): void {
  if (!/^[a-zA-Z0-9-]{16,100}$/.test(descriptor.uploadId)) throw new PendingUploadError('Invalid upload identifier');
  if (!descriptor.fileName || descriptor.fileName.length > 255) throw new PendingUploadError('Invalid file name');
  if (descriptor.contentType !== 'application/pdf') throw new PendingUploadError('Only PDF files can be uploaded');
  if (!Number.isInteger(descriptor.size) || descriptor.size < 1 || descriptor.size > 50 * 1024 * 1024) throw new PendingUploadError('File size must be between 1 byte and 50MB');
  if (!Number.isInteger(descriptor.totalParts) || descriptor.totalParts < 1 || descriptor.totalParts > 17) throw new PendingUploadError('Invalid upload part count');
}

function sameDescriptor(left: UploadPartDescriptor, right: UploadPartDescriptor): boolean {
  return left.fileName === right.fileName && left.contentType === right.contentType && left.size === right.size && left.totalParts === right.totalParts;
}

export async function saveUploadPart(descriptor: UploadPartDescriptor, index: number, bytes: Buffer): Promise<void> {
  validateDescriptor(descriptor);
  if (!Number.isInteger(index) || index < 0 || index >= descriptor.totalParts) throw new PendingUploadError('Invalid upload part index');
  if (bytes.length === 0 || bytes.length > UPLOAD_PART_BYTES) throw new PendingUploadError('Upload part is too large');
  const encoded = bytes.toString('base64');

  if (hasKv()) {
    const kv = await kvClient();
    const existing = await kv.get<StoredPartUpload>(metadataKey(descriptor.uploadId));
    if (existing && !sameDescriptor(existing, descriptor)) throw new PendingUploadError('Upload metadata changed; start the upload again');
    const pipeline = kv.pipeline();
    pipeline.set(metadataKey(descriptor.uploadId), descriptor, { ex: PART_TTL_SECONDS });
    pipeline.set(partKey(descriptor.uploadId, index), encoded, { ex: PART_TTL_SECONDS });
    await pipeline.exec();
    return;
  }

  const existing = memoryMetadata.get(descriptor.uploadId);
  if (existing && !sameDescriptor(existing, descriptor)) throw new PendingUploadError('Upload metadata changed; start the upload again');
  memoryMetadata.set(descriptor.uploadId, descriptor);
  memoryParts.set(partKey(descriptor.uploadId, index), encoded);
}

export async function consumeUploadParts(descriptor: UploadPartDescriptor): Promise<Buffer> {
  validateDescriptor(descriptor);
  let metadata: StoredPartUpload | undefined;
  let encodedParts: Array<string | null>;
  if (hasKv()) {
    const kv = await kvClient();
    metadata = await kv.get<StoredPartUpload>(metadataKey(descriptor.uploadId)) ?? undefined;
    encodedParts = await kv.mget<string[]>(...Array.from({ length: descriptor.totalParts }, (_, index) => partKey(descriptor.uploadId, index)));
  } else {
    metadata = memoryMetadata.get(descriptor.uploadId);
    encodedParts = Array.from({ length: descriptor.totalParts }, (_, index) => memoryParts.get(partKey(descriptor.uploadId, index)) ?? null);
  }
  if (!metadata || !sameDescriptor(metadata, descriptor) || encodedParts.some((part) => !part)) throw new PendingUploadError('The upload is incomplete or expired. Please choose the file again.');
  const buffer = Buffer.concat(encodedParts.map((part) => Buffer.from(part!, 'base64')));
  if (buffer.length !== descriptor.size) throw new PendingUploadError('The upload could not be verified. Please choose the file again.');
  return buffer;
}

export async function clearUploadParts(descriptors: UploadPartDescriptor[]): Promise<void> {
  if (hasKv()) {
    const kv = await kvClient();
    const keys = descriptors.flatMap((descriptor) => [metadataKey(descriptor.uploadId), ...Array.from({ length: descriptor.totalParts }, (_, index) => partKey(descriptor.uploadId, index))]);
    if (keys.length) await kv.del(...keys);
    return;
  }
  for (const descriptor of descriptors) {
    memoryMetadata.delete(descriptor.uploadId);
    for (let index = 0; index < descriptor.totalParts; index += 1) memoryParts.delete(partKey(descriptor.uploadId, index));
  }
}
