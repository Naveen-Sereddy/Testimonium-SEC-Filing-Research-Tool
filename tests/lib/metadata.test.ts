import { describe, it, expect } from 'vitest';
import { extractFilingMetadata } from '../../lib/metadata';

describe('extractFilingMetadata', () => {
  it('extracts company and fiscal year end from a standard SEC cover page', () => {
    const pages = [
      {
        pageNumber: 1,
        text: [
          'UNITED STATES',
          'SECURITIES AND EXCHANGE COMMISSION',
          'Form 10-K',
          'For the fiscal year ended December 31, 2025',
          'HERON THERAPEUTICS, INC.',
          '(Exact name of registrant as specified in its charter)',
          'DELAWARE',
        ].join('\n'),
      },
    ];

    expect(extractFilingMetadata(pages)).toEqual({
      company: 'HERON THERAPEUTICS, INC.',
      fiscalYearEnd: 'December 31, 2025',
    });
  });

  it('returns nulls instead of guessing when the cover page does not match the standard form', () => {
    const pages = [{ pageNumber: 1, text: 'Some scanned document with no recognizable SEC cover page.' }];

    expect(extractFilingMetadata(pages)).toEqual({ company: null, fiscalYearEnd: null });
  });

  it('only looks at the first three pages', () => {
    const pages = [
      { pageNumber: 1, text: 'irrelevant' },
      { pageNumber: 2, text: 'also irrelevant' },
      { pageNumber: 3, text: 'still irrelevant' },
      {
        pageNumber: 4,
        text: 'LATE COMPANY, INC.\n(Exact name of registrant as specified in its charter)',
      },
    ];

    expect(extractFilingMetadata(pages)).toEqual({ company: null, fiscalYearEnd: null });
  });
});
