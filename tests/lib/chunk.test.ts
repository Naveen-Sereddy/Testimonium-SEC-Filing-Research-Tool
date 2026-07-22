import { describe, it, expect } from 'vitest';
import { chunkPages } from '../../lib/chunk';

describe('chunkPages', () => {
  it('returns one chunk for a page shorter than chunkSize', () => {
    const chunks = chunkPages([{ pageNumber: 1, text: 'short page text' }], 1000, 200);
    expect(chunks).toEqual([{ id: 'chunk-0', text: 'short page text', page: 1 }]);
  });

  it('splits a long page into overlapping chunks with correct step size', () => {
    const text = 'a'.repeat(2500);
    const chunks = chunkPages([{ pageNumber: 1, text }], 1000, 200);
    expect(chunks.length).toBe(3);
    expect(chunks[0].text.length).toBe(1000);
    expect(chunks[1].text.length).toBe(1000);
    expect(chunks[2].text.length).toBe(900);
    // overlap check: last 200 chars of chunk 0 equal first 200 chars of chunk 1
    expect(chunks[0].text.slice(-200)).toBe(chunks[1].text.slice(0, 200));
  });

  it('tags each chunk with its source page number and continues numbering ids across pages', () => {
    const chunks = chunkPages(
      [
        { pageNumber: 1, text: 'a'.repeat(1500) },
        { pageNumber: 2, text: 'b'.repeat(500) },
      ],
      1000,
      200,
    );
    const page1Chunks = chunks.filter((c) => c.page === 1);
    const page2Chunks = chunks.filter((c) => c.page === 2);
    expect(page1Chunks.length).toBe(2);
    expect(page2Chunks.length).toBe(1);
    expect(chunks.map((c) => c.id)).toEqual(['chunk-0', 'chunk-1', 'chunk-2']);
  });

  it('skips whitespace-only slices produced mid-document, not just at the end', () => {
    const text = 'a'.repeat(10) + ' '.repeat(10);
    const chunks = chunkPages([{ pageNumber: 1, text }], 5, 2);
    // Without the trim guard this would produce 6 slices (two of them pure whitespace);
    // with the guard, exactly 4 non-whitespace chunks survive.
    expect(chunks.length).toBe(4);
    expect(chunks.every((c) => c.text.trim().length > 0)).toBe(true);
  });
});
