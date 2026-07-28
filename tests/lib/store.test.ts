import { describe, it, expect, beforeEach } from 'vitest';
import { resetStore, addChunks, getAllChunks, StoredChunk } from '../../lib/store';

const SESSION = 'test-session';

const sample: StoredChunk = {
  id: 'chunk-0',
  text: 'sample text',
  page: 1,
  section: 'Risk Factors',
  embedding: [0.1, 0.2, 0.3],
};

describe('store', () => {
  beforeEach(() => resetStore(SESSION));

  it('starts empty', async () => {
    expect(await getAllChunks(SESSION)).toEqual([]);
  });

  it('accumulates chunks across multiple addChunks calls', async () => {
    await addChunks(SESSION, [sample]);
    await addChunks(SESSION, [{ ...sample, id: 'chunk-1' }]);
    expect((await getAllChunks(SESSION)).length).toBe(2);
  });

  it('resetStore clears all chunks', async () => {
    await addChunks(SESSION, [sample]);
    await resetStore(SESSION);
    expect(await getAllChunks(SESSION)).toEqual([]);
  });

  it('keeps separate sessions independent', async () => {
    await addChunks(SESSION, [sample]);
    expect(await getAllChunks('other-session')).toEqual([]);
  });
});
