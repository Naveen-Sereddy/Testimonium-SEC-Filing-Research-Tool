import { describe, expect, it } from 'vitest';
import { followUpSuggestions } from '../../components/ResponseCard';

describe('followUpSuggestions', () => {
  it('removes the question verb before composing a year-over-year follow-up', () => {
    const suggestions = followUpSuggestions(
      "What was Plug Power's total revenue in 2023?",
      [{ id: 1, page: 4, section: 'MD&A', excerpt: 'Revenue discussion.' }],
      ['MD&A', 'Risk Factors'],
    );

    expect(suggestions[0]).toBe("How did Plug Power's total revenue in 2023 change from the prior year?");
    expect(suggestions[0]).not.toContain('did was');
  });
});
