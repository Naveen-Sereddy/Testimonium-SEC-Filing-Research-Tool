import type { Chunk } from './chunk';

export interface StoredChunk extends Chunk {
  section: string;
  embedding: number[];
}

let store: StoredChunk[] = [];

export function resetStore(): void {
  store = [];
}

export function addChunks(chunks: StoredChunk[]): void {
  store.push(...chunks);
}

export function getAllChunks(): StoredChunk[] {
  return store;
}
