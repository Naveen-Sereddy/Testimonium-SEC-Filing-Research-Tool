import { describe, it, expect } from 'vitest';
import { splitAnswerOnCitations } from '../../lib/parseCitations';

describe('splitAnswerOnCitations', () => {
  it('splits text around [N] markers into alternating text and citation-id segments', () => {
    const result = splitAnswerOnCitations('Exposure is significant [1] per the filing [2].');
    expect(result).toEqual([
      { type: 'text', value: 'Exposure is significant ' },
      { type: 'citation', id: 1 },
      { type: 'text', value: ' per the filing ' },
      { type: 'citation', id: 2 },
      { type: 'text', value: '.' },
    ]);
  });

  it('returns a single text segment when there are no citation markers', () => {
    expect(splitAnswerOnCitations('No citations here.')).toEqual([{ type: 'text', value: 'No citations here.' }]);
  });
});
