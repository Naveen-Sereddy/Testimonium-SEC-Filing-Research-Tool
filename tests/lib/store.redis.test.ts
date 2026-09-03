import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fakeRedis = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  pipelineSizes: [] as number[],
  mgetSizes: [] as number[],
  delSizes: [] as number[],
  setTtls: [] as Array<number | undefined>,
  chunkKeys: [] as string[],
}));

vi.mock('@upstash/redis', () => {
  class Redis {
    async get<T>(key: string): Promise<T | null> {
      return (fakeRedis.values.get(key) as T | undefined) ?? null;
    }

    async set(key: string, value: unknown, options?: { ex?: number }): Promise<void> {
      fakeRedis.values.set(key, value);
      fakeRedis.setTtls.push(options?.ex);
    }

    async mget<T>(...keys: string[]): Promise<T[]> {
      fakeRedis.mgetSizes.push(keys.length);
      return keys.map((key) => (fakeRedis.values.get(key) ?? null)) as T[];
    }

    async del(...keys: string[]): Promise<void> {
      fakeRedis.delSizes.push(keys.length);
      keys.forEach((key) => fakeRedis.values.delete(key));
    }

    pipeline() {
      const writes: Array<{ key: string; value: unknown; ttl?: number }> = [];
      return {
        set(key: string, value: unknown, options?: { ex?: number }) {
          writes.push({ key, value, ttl: options?.ex });
        },
        async exec() {
          fakeRedis.pipelineSizes.push(writes.length);
          for (const write of writes) {
            fakeRedis.values.set(write.key, write.value);
            fakeRedis.setTtls.push(write.ttl);
            fakeRedis.chunkKeys.push(write.key);
          }
        },
      };
    }
  }

  return { Redis };
});

import { addChunks, getAllChunks, KV_BATCH_SIZE, redisChunkKey, resetStore } from '../../lib/store';

describe('Redis store safety', () => {
  beforeEach(() => {
    process.env.KV_REST_API_URL = 'https://example.upstash.io';
    process.env.KV_REST_API_TOKEN = 'test-token';
    fakeRedis.values.clear();
    fakeRedis.pipelineSizes.length = 0;
    fakeRedis.mgetSizes.length = 0;
    fakeRedis.delSizes.length = 0;
    fakeRedis.setTtls.length = 0;
    fakeRedis.chunkKeys.length = 0;
  });

  afterEach(() => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it('namespaces chunks by session, document, and chunk id with a one-hour TTL', async () => {
    expect(redisChunkKey('session-id', 'filing-2', 'chunk-9')).toBe('session-id:filing-2:chunk-9');
    await addChunks('session-id', [
      { id: 'chunk-9', documentId: 'filing-2', text: 'text', page: 1, section: 'Risk Factors', embedding: [1, 0] },
    ]);
    expect(fakeRedis.chunkKeys).toEqual(['session-id:filing-2:chunk-9']);
    expect(fakeRedis.setTtls.every((ttl) => ttl === 3600)).toBe(true);
  });

  it('caps pipelined writes, multi-key reads, and deletes at 30 keys', async () => {
    const chunks = Array.from({ length: 65 }, (_, index) => ({
      id: `chunk-${index}`,
      documentId: 'filing-1',
      text: `text ${index}`,
      page: index + 1,
      section: 'Risk Factors',
      embedding: [1, 0],
    }));

    await addChunks('large-session', chunks);
    expect(fakeRedis.pipelineSizes).toEqual([KV_BATCH_SIZE, KV_BATCH_SIZE, 5]);

    expect(await getAllChunks('large-session')).toHaveLength(65);
    expect(Math.max(...fakeRedis.mgetSizes)).toBeLessThanOrEqual(KV_BATCH_SIZE);

    await resetStore('large-session');
    expect(Math.max(...fakeRedis.delSizes)).toBeLessThanOrEqual(KV_BATCH_SIZE);
  });
});
