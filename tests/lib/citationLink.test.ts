import { describe, expect, it } from 'vitest';
import { citationPageUrl } from '../../lib/citationLink';

describe('citationPageUrl', () => {
  it('creates a PDF page anchor without changing the document URL', () => {
    expect(citationPageUrl('blob:https://testimonium.vercel.app/filing', 51)).toBe('blob:https://testimonium.vercel.app/filing#page=51');
  });

  it('guards against invalid PDF page numbers', () => {
    expect(citationPageUrl('blob:filing', 0)).toBe('blob:filing#page=1');
  });
});
