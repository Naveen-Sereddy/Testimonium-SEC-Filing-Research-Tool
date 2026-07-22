import { describe, it, expect, vi, beforeEach } from 'vitest';

const createMock = vi.fn();

vi.mock('openai', () => ({
  default: class {
    embeddings = { create: createMock };
  },
}));

import { embedTexts } from '../../lib/embeddings';

describe('embedTexts', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('calls the embeddings API with gemini-embedding-001 and returns the embedding vectors in order', async () => {
    createMock.mockResolvedValue({
      data: [
        { embedding: [0.1, 0.2] },
        { embedding: [0.3, 0.4] },
      ],
    });

    const result = await embedTexts(['first chunk', 'second chunk']);

    expect(createMock).toHaveBeenCalledWith({
      model: 'gemini-embedding-001',
      input: ['first chunk', 'second chunk'],
    });
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });

  it('splits requests into batches of 100 (Gemini\'s embeddings batch limit) and preserves order across batches', async () => {
    const texts = Array.from({ length: 205 }, (_, i) => `chunk-${i}`);

    createMock.mockImplementation(async ({ input }: { input: string[] }) => ({
      data: input.map((text) => ({ embedding: [text.length] })),
    }));

    const result = await embedTexts(texts);

    expect(createMock).toHaveBeenCalledTimes(3);
    expect(createMock.mock.calls[0][0].input).toHaveLength(100);
    expect(createMock.mock.calls[1][0].input).toHaveLength(100);
    expect(createMock.mock.calls[2][0].input).toHaveLength(5);
    expect(result).toHaveLength(205);
    expect(result[0]).toEqual([texts[0].length]);
    expect(result[204]).toEqual([texts[204].length]);
  });
});
