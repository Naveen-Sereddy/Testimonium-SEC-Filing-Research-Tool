import { describe, expect, it } from 'vitest';
import { extractFinancialTableChunks } from '../../lib/tables';

describe('extractFinancialTableChunks', () => {
  it('keeps table rows grounded to the financial-statements page and records columns', () => {
    const chunks = extractFinancialTableChunks(
      [
        {
          pageNumber: 8,
          text: [
            'Item 8. Financial Statements',
            'Consolidated Statements of Operations',
            'Years ended December 31 2025 2024',
            'Revenue 100 90',
            'Net income 20 15',
          ].join('\n'),
        },
      ],
      new Map([[8, 'Financial Statements']]),
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].kind).toBe('table');
    expect(chunks[0].table?.title).toContain('Consolidated Statements');
    expect(chunks[0].table?.columns).toEqual(['2025', '2024']);
    expect(chunks[0].text).toContain('Revenue 100 90');
  });

  it('preserves accounting negatives, column order, and unit scaling', () => {
    const chunks = extractFinancialTableChunks(
      [{
        pageNumber: 12,
        text: [
          'Consolidated Statements of Operations',
          '(in millions, except per-share data)',
          'Years ended December 31 2025 2024',
          'Revenue $ 1,250 $ 1,100',
          'Operating loss ($45) ($32)',
        ].join('\n'),
      }],
      new Map([[12, 'Financial Statements']]),
    );

    expect(chunks[0].table?.columns).toEqual(['2025', '2024']);
    expect(chunks[0].table?.unitScale).toContain('millions');
    expect(chunks[0].table?.rows).toEqual([
      { label: 'Revenue', values: ['$1,250', '$1,100'] },
      { label: 'Operating loss', values: ['($45)', '($32)'] },
    ]);
  });
});
