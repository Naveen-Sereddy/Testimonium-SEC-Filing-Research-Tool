import type { Chunk } from './chunk';

export interface StoredChunk extends Chunk {
  section: string;
  embedding: number[];
}

// Serverless functions don't share memory across instances, so a plain module
// array only survives as long as a request happens to land back on the same
// warm instance. Upstash Redis (via the Vercel Marketplace Redis integration)
// persists chunks across instances, keyed per upload session. The in-memory
// Map is a local-dev fallback only (single process, no cross-instance problem
// there) so `npm run dev` works without Redis creds.
//
// Each chunk is stored under its own key rather than one big JSON blob per
// session: a full document's chunks, embeddings included, comfortably exceed
// Upstash's 10MB single-request limit, while a single chunk (~1000 chars of
// text plus its embedding vector) never comes close.
const SESSION_TTL_SECONDS = 60 * 60;
const memoryStore = new Map<string, StoredChunk[]>();

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

function countKey(sessionId: string): string {
  return `session:${sessionId}:count`;
}

function chunkKey(sessionId: string, index: number): string {
  return `session:${sessionId}:chunk:${index}`;
}

export async function resetStore(sessionId: string): Promise<void> {
  if (hasKv()) {
    const kv = await kvClient();
    const count = Number((await kv.get<number>(countKey(sessionId))) ?? 0);
    const keys = [countKey(sessionId), ...Array.from({ length: count }, (_, i) => chunkKey(sessionId, i))];
    if (keys.length) await kv.del(...keys);
    return;
  }
  memoryStore.delete(sessionId);
}

export async function addChunks(sessionId: string, chunks: StoredChunk[]): Promise<void> {
  if (hasKv()) {
    const kv = await kvClient();
    const start = Number((await kv.get<number>(countKey(sessionId))) ?? 0);
    const pipeline = kv.pipeline();
    chunks.forEach((chunk, i) => pipeline.set(chunkKey(sessionId, start + i), chunk, { ex: SESSION_TTL_SECONDS }));
    pipeline.set(countKey(sessionId), start + chunks.length, { ex: SESSION_TTL_SECONDS });
    await pipeline.exec();
    return;
  }
  memoryStore.set(sessionId, [...(memoryStore.get(sessionId) ?? []), ...chunks]);
}

export async function getAllChunks(sessionId: string): Promise<StoredChunk[]> {
  if (hasKv()) {
    const kv = await kvClient();
    const count = Number((await kv.get<number>(countKey(sessionId))) ?? 0);
    if (count === 0) return [];
    const keys = Array.from({ length: count }, (_, i) => chunkKey(sessionId, i));
    const results = await kv.mget<StoredChunk[]>(...keys);
    return results.filter((c): c is StoredChunk => c !== null);
  }
  return memoryStore.get(sessionId) ?? [];
}
