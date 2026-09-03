import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { extractPages } from '../../lib/pdf';
import { sectionsForPages } from '../../lib/sections';
import { extractFinancialTableChunks } from '../../lib/tables';
import type { Chunk } from '../../lib/chunk';

describe('financial table extraction against the bundled SEC filing', () => {
  let chunks: Chunk[];

  beforeAll(async () => {
    const bytes = await readFile(path.resolve(__dirname, '../../public/demo/sample-10k.pdf'));
    const pages = await extractPages(bytes);
    chunks = extractFinancialTableChunks(pages, sectionsForPages(pages));
  });

  it('indexes only the three approved primary statement pages', () => {
    expect(Array.from(new Set(chunks.map((chunk) => chunk.page)))).toEqual([76, 77, 79]);
    expect(Array.from(new Set(chunks.map((chunk) => chunk.table?.title)))).toEqual([
      'CONSOLIDATED BALANCE SHEETS',
      'CONSOLIDATED STATEMENTS OF OPERATIONS AND COMPREHENSIVE LOSS',
      'CONSOLIDATED STATEMENTS OF CASH FLOWS',
    ]);
  });

  it('preserves reported values, accounting negatives, and year order', () => {
    const tableRows = chunks.flatMap((chunk) => chunk.table?.rows ?? []);
    expect(tableRows.find((row) => row.label === 'Net loss')?.values).toEqual(['(20,195)', '(13,580)', '(110,559)']);
    expect(tableRows.find((row) => row.label === 'Cash and cash equivalents at end of year')?.values).toEqual([
      '$28,647',
      '$25,802',
      '$28,677',
    ]);
    expect(chunks.find((chunk) => chunk.page === 77)?.table?.columns).toEqual(['2025', '2024', '2023']);
    expect(chunks.find((chunk) => chunk.page === 77)?.table?.unitScale).toContain('thousands');
  });
});
