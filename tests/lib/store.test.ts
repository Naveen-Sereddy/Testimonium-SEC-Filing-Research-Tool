import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, addChunks, getAllChunks, StoredChunk } from '../../lib/store';

const sample: StoredChunk = {
  id: 'chunk-0',
  text: 'sample text',
  page: 1,
  section: 'Risk Factors',
  embedding: [0.1, 0.2, 0.3],
};

describe('store', () => {
  beforeEach(() => resetStore());

  it('starts empty', () => {
    expect(getAllChunks()).toEqual([]);
  });

  it('accumulates chunks across multiple addChunks calls', () => {
    addChunks([sample]);
    addChunks([{ ...sample, id: 'chunk-1' }]);
    expect(getAllChunks().length).toBe(2);
  });

  it('resetStore clears all chunks', () => {
    addChunks([sample]);
    resetStore();
    expect(getAllChunks()).toEqual([]);
  });
});
