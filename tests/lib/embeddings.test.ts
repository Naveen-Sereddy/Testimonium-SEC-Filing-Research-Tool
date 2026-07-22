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

  it('calls the embeddings API with text-embedding-3-small and returns the embedding vectors in order', async () => {
    createMock.mockResolvedValue({
      data: [
        { embedding: [0.1, 0.2] },
        { embedding: [0.3, 0.4] },
      ],
    });

    const result = await embedTexts(['first chunk', 'second chunk']);

    expect(createMock).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: ['first chunk', 'second chunk'],
    });
    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
  });
});
