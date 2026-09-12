import { describe, expect, it } from 'vitest';
import { tableFromExcerpt } from '../../lib/excerptTables';

describe('tableFromExcerpt', () => {
  it('adds aligned comparison columns to an MD&A table extracted as prose', () => {
    const table = tableFromExcerpt([
      'Cost of Gross Gross',
      'Net Revenue Revenue Profit/(Loss) Margin/(Loss)',
      'For the year ended December 31, 2023:',
      'Fuel delivered to customers and related equipment 66,246 246,318 (180,072) (271.8)%',
      'Other 10,837 6,544 4,293 39.6 %',
      'Total $ 891,340 $ 1,399,131 $ (507,791) (57.0)%',
    ].join('\n'));

    expect(table?.columns).toEqual(['Net revenue', 'Cost of revenue', 'Gross profit/(loss)', 'Gross margin/(loss)']);
    expect(table?.rows).toContainEqual({ label: 'Fuel delivered to customers and related equipment', values: ['66,246', '246,318', '(180,072)', '(271.8)%'] });
    expect(table?.rows).toContainEqual({ label: 'Total', values: ['$ 891,340', '$ 1,399,131', '$ (507,791)', '(57.0)%'] });
  });
});
