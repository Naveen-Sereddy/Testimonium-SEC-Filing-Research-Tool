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

  it('maps a dual-filing citation to exact 1-based pages and citation ids', () => {
    const result = splitAnswerOnCitations('Language changed [FY23 p. 42 -> FY24 p. 45].', [
      { id: 2, filingYear: 2023, page: 42 },
      { id: 5, filingYear: 2024, page: 45 },
    ]);
    expect(result).toEqual([
      { type: 'text', value: 'Language changed ' },
      { type: 'dual-citation', previousId: 2, currentId: 5, previousLabel: 'FY23 p. 42', currentLabel: 'FY24 p. 45' },
      { type: 'text', value: '.' },
    ]);
  });

  it('leaves an unresolved dual citation as text instead of linking the wrong page', () => {
    expect(splitAnswerOnCitations('[FY23 p. 41 → FY24 p. 45]', [
      { id: 2, filingYear: 2023, page: 42 },
      { id: 5, filingYear: 2024, page: 45 },
    ])).toEqual([{ type: 'text', value: '[FY23 p. 41 → FY24 p. 45]' }]);
  });

  it('does not guess when multiple chunks share the same filing year and page', () => {
    expect(splitAnswerOnCitations('[FY23 p. 42 -> FY24 p. 45]', [
      { id: 1, filingYear: 2023, page: 42 },
      { id: 2, filingYear: 2023, page: 42 },
      { id: 3, filingYear: 2024, page: 45 },
    ])).toEqual([{ type: 'text', value: '[FY23 p. 42 -> FY24 p. 45]' }]);
  });
});
