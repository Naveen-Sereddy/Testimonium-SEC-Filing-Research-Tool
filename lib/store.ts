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

export async function resetStore(sessionId: string): Promise<void> {
  if (hasKv()) {
    await (await kvClient()).del(`session:${sessionId}`);
    return;
  }
  memoryStore.delete(sessionId);
}

export async function addChunks(sessionId: string, chunks: StoredChunk[]): Promise<void> {
  const next = [...(await getAllChunks(sessionId)), ...chunks];
  if (hasKv()) {
    await (await kvClient()).set(`session:${sessionId}`, next, { ex: SESSION_TTL_SECONDS });
    return;
  }
  memoryStore.set(sessionId, next);
}

export async function getAllChunks(sessionId: string): Promise<StoredChunk[]> {
  if (hasKv()) {
    return (await (await kvClient()).get<StoredChunk[]>(`session:${sessionId}`)) ?? [];
  }
  return memoryStore.get(sessionId) ?? [];
}
