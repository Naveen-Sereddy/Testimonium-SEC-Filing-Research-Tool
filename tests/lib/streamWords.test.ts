import { describe, expect, it } from 'vitest';
import { streamWords } from '../../lib/streamWords';

describe('streamWords', () => {
  it('reveals a model response in readable pieces without changing it', () => {
    const answer = 'Revenue rose 12.4% in 2025.\n\nSee [1].';
    const pieces = streamWords(answer);
    expect(pieces).toEqual(['Revenue ', 'rose ', '12.4% ', 'in ', '2025.\n\n', 'See ', '[1].']);
    expect(pieces.join('')).toBe(answer);
  });
});
