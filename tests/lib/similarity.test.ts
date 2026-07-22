import { describe, it, expect } from 'vitest';
import { cosineSimilarity, topK } from '../../lib/similarity';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it('returns 0 when either vector is all zeros', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('topK', () => {
  it('returns the k highest-scoring items sorted descending', () => {
    const items = ['a', 'b', 'c', 'd'];
    const embeddings = [
      [1, 0],
      [0.9, 0.1],
      [0, 1],
      [-1, 0],
    ];
    const query = [1, 0];
    const result = topK(items, embeddings, query, 2);
    expect(result.map((r) => r.item)).toEqual(['a', 'b']);
    expect(result[0].score).toBeGreaterThan(result[1].score);
  });
});
