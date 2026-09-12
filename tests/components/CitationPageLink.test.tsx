import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CitationPageLink } from '../../components/CitationPageLink';

describe('CitationPageLink', () => {
  it('keeps the page action visible even when an older workspace has no local PDF', () => {
    const markup = renderToStaticMarkup(<CitationPageLink sourceUrl={null} page={77} />);
    expect(markup).toContain('Jump to page 77');
  });

  it('uses a new-tab page anchor when the original PDF is available', () => {
    const markup = renderToStaticMarkup(<CitationPageLink sourceUrl="blob:https://testimonium.vercel.app/filing" page={77} />);
    expect(markup).toContain('href="blob:https://testimonium.vercel.app/filing#page=77"');
    expect(markup).toContain('target="_blank"');
  });
});
