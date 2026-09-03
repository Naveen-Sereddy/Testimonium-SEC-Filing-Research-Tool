import type { Chunk } from './chunk';

export interface SessionDocument {
  id: string;
  fileName: string;
  company: string | null;
  fiscalYearEnd: string | null;
  filingYear: number | null;
  pageCount: number;
  indexedSections: string[];
}

export interface StoredChunk extends Chunk {
  section: string;
  embedding: number[];
  documentId?: string;
}

const SESSION_TTL_SECONDS = 60 * 60;
export const KV_BATCH_SIZE = 30;
const DEFAULT_DOCUMENT_ID = 'document';

const memoryStore = new Map<string, StoredChunk[]>();
const memoryDocuments = new Map<string, SessionDocument[]>();

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvClient() {
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

function documentsKey(sessionId: string): string {
  return `session:${sessionId}:documents`;
}

function documentIdsKey(sessionId: string): string {
  return `session:${sessionId}:document-ids`;
}

function chunkIdsKey(sessionId: string, documentId: string): string {
  return `session:${sessionId}:${documentId}:chunk-ids`;
}

export function redisChunkKey(sessionId: string, documentId: string, chunkId: string): string {
  return `${sessionId}:${documentId}:${chunkId}`;
}

function batches<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += KV_BATCH_SIZE) {
    result.push(items.slice(index, index + KV_BATCH_SIZE));
  }
  return result;
}

async function readInBatches<T>(kv: Awaited<ReturnType<typeof kvClient>>, keys: string[]): Promise<Array<T | null>> {
  const values: Array<T | null> = [];
  for (const batch of batches(keys)) {
    values.push(...(await kv.mget<T[]>(...batch)));
  }
  return values;
}

async function deleteInBatches(kv: Awaited<ReturnType<typeof kvClient>>, keys: string[]): Promise<void> {
  for (const batch of batches(keys)) {
    await kv.del(...batch);
  }
}

export async function resetStore(sessionId: string): Promise<void> {
  if (hasKv()) {
    const kv = await kvClient();
    const documentIds = (await kv.get<string[]>(documentIdsKey(sessionId))) ?? [];
    const indexKeys = documentIds.map((documentId) => chunkIdsKey(sessionId, documentId));
    const chunkIdLists = await readInBatches<string[]>(kv, indexKeys);
    const chunkKeys = documentIds.flatMap((documentId, index) =>
      (chunkIdLists[index] ?? []).map((chunkId) => redisChunkKey(sessionId, documentId, chunkId)),
    );
    await deleteInBatches(kv, [documentsKey(sessionId), documentIdsKey(sessionId), ...indexKeys, ...chunkKeys]);
    return;
  }
  memoryStore.delete(sessionId);
  memoryDocuments.delete(sessionId);
}

export async function addChunks(sessionId: string, chunks: StoredChunk[]): Promise<void> {
  if (chunks.length === 0) return;

  if (hasKv()) {
    const kv = await kvClient();
    const grouped = new Map<string, StoredChunk[]>();
    for (const chunk of chunks) {
      const documentId = chunk.documentId ?? DEFAULT_DOCUMENT_ID;
      grouped.set(documentId, [...(grouped.get(documentId) ?? []), chunk]);
    }

    const existingDocumentIds = (await kv.get<string[]>(documentIdsKey(sessionId))) ?? [];
    const documentIds = Array.from(new Set([...existingDocumentIds, ...grouped.keys()]));

    for (const [documentId, documentChunks] of grouped) {
      const existingChunkIds = (await kv.get<string[]>(chunkIdsKey(sessionId, documentId))) ?? [];
      const chunkIds = Array.from(new Set([...existingChunkIds, ...documentChunks.map((chunk) => chunk.id)]));

      for (const batch of batches(documentChunks)) {
        const pipeline = kv.pipeline();
        for (const chunk of batch) {
          pipeline.set(redisChunkKey(sessionId, documentId, chunk.id), chunk, { ex: SESSION_TTL_SECONDS });
        }
        await pipeline.exec();
      }

      await kv.set(chunkIdsKey(sessionId, documentId), chunkIds, { ex: SESSION_TTL_SECONDS });
    }

    await kv.set(documentIdsKey(sessionId), documentIds, { ex: SESSION_TTL_SECONDS });
    return;
  }

  memoryStore.set(sessionId, [...(memoryStore.get(sessionId) ?? []), ...chunks]);
}

export async function setSessionDocuments(sessionId: string, documents: SessionDocument[]): Promise<void> {
  if (hasKv()) {
    const kv = await kvClient();
    await kv.set(documentsKey(sessionId), documents, { ex: SESSION_TTL_SECONDS });
    return;
  }
  memoryDocuments.set(sessionId, documents);
}

export async function getSessionDocuments(sessionId: string): Promise<SessionDocument[]> {
  if (hasKv()) {
    const kv = await kvClient();
    return (await kv.get<SessionDocument[]>(documentsKey(sessionId))) ?? [];
  }
  return memoryDocuments.get(sessionId) ?? [];
}

export async function getAllChunks(sessionId: string): Promise<StoredChunk[]> {
  if (hasKv()) {
    const kv = await kvClient();
    const documentIds = (await kv.get<string[]>(documentIdsKey(sessionId))) ?? [];
    if (documentIds.length === 0) return [];

    const indexKeys = documentIds.map((documentId) => chunkIdsKey(sessionId, documentId));
    const chunkIdLists = await readInBatches<string[]>(kv, indexKeys);
    const keys = documentIds.flatMap((documentId, index) =>
      (chunkIdLists[index] ?? []).map((chunkId) => redisChunkKey(sessionId, documentId, chunkId)),
    );
    const chunks = await readInBatches<StoredChunk>(kv, keys);
    return chunks.filter((chunk): chunk is StoredChunk => chunk !== null);
  }

  return memoryStore.get(sessionId) ?? [];
}
