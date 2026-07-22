import { describe, it, expect } from 'vitest';
import { sectionsForPages, tagAndFilterChunks, ALLOWED_SECTIONS } from '../../lib/sections';
import type { RawPage, Chunk } from '../../lib/chunk';

describe('sectionsForPages', () => {
  it('tags pages before any heading as Unknown', () => {
    const pages: RawPage[] = [{ pageNumber: 1, text: 'Cover page, no headings here.' }];
    const map = sectionsForPages(pages);
    expect(map.get(1)).toBe('Unknown');
  });

  it('detects Risk Factors, Legal Proceedings, and MD&A headings', () => {
    const pages: RawPage[] = [
      { pageNumber: 1, text: 'Item 1A. Risk Factors\nOur exposure to credit risk...' },
      { pageNumber: 2, text: 'Continued risk discussion...' },
      { pageNumber: 3, text: "Item 7. Management's Discussion and Analysis\nRevenue grew..." },
      { pageNumber: 4, text: 'Item 3. Legal Proceedings\nWe are subject to claims...' },
    ];
    const map = sectionsForPages(pages);
    expect(map.get(1)).toBe('Risk Factors');
    expect(map.get(2)).toBe('Risk Factors');
    expect(map.get(3)).toBe('MD&A');
    expect(map.get(4)).toBe('Legal Proceedings');
  });

  it('skips table-of-contents pages when detecting section headings', () => {
    const pages: RawPage[] = [
      {
        pageNumber: 1,
        text: 'TABLE OF CONTENTS\nItem 1. Business .............. 5\nItem 1A. Risk Factors .......... 12\nItem 3. Legal Proceedings .... 60\nItem 7. Management\'s Discussion and Analysis .... 85',
      },
      { pageNumber: 2, text: 'Item 1. Business\nWe operate in...' },
      { pageNumber: 3, text: 'Item 1A. Risk Factors\nWe face credit risk...' },
    ];
    const map = sectionsForPages(pages);
    // ToC page (page 1) with multiple item headings should not update current,
    // so it stays 'Unknown'
    expect(map.get(1)).toBe('Unknown');
    // Page 2 (Business) has only one item heading and should not match our patterns
    expect(map.get(2)).toBe('Unknown');
    // Page 3 should detect Risk Factors
    expect(map.get(3)).toBe('Risk Factors');
  });

  it('detects headings with colon, dash, and em-dash separators', () => {
    const pages: RawPage[] = [
      { pageNumber: 1, text: 'Item 1A: Risk Factors\nCredit risk exposure...' },
      { pageNumber: 2, text: 'Item 3 - Legal Proceedings\nWe face litigation...' },
      { pageNumber: 3, text: "Item 7 — Management's Discussion and Analysis\nRevenue..." }, // em-dash
    ];
    const map = sectionsForPages(pages);
    expect(map.get(1)).toBe('Risk Factors');
    expect(map.get(2)).toBe('Legal Proceedings');
    expect(map.get(3)).toBe('MD&A');
  });
});

describe('tagAndFilterChunks', () => {
  it('drops chunks whose page section is not in ALLOWED_SECTIONS', () => {
    const chunks: Chunk[] = [
      { id: 'chunk-0', text: 'cover page text', page: 1 },
      { id: 'chunk-1', text: 'risk factor text', page: 2 },
    ];
    const sectionMap = new Map([
      [1, 'Unknown'],
      [2, 'Risk Factors'],
    ]);
    const result = tagAndFilterChunks(chunks, sectionMap);
    expect(result.length).toBe(1);
    expect(result[0]).toEqual({ id: 'chunk-1', text: 'risk factor text', page: 2, section: 'Risk Factors' });
  });

  it('exposes the allowed section list used by the filter', () => {
    expect(ALLOWED_SECTIONS).toEqual(['Risk Factors', 'Legal Proceedings', 'MD&A']);
  });
});
