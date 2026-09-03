import type { Chunk, RawPage, TableMetadata } from './chunk';

/**
 * Lightweight table detection for text extracted from SEC 10-K PDFs.
 *
 * PDF extraction does not preserve a universal table format, so this parser
 * deliberately records the detected rows as source text and keeps the
 * inferred columns conservative. It is a grounding aid, not a claim of full
 * XBRL or visual-table fidelity.
 */
const PRIMARY_TABLE_HEADING = /^(?:consolidated|condensed consolidated)\s+(?:balance sheets?|statements?\s+of\s+(?:operations(?:\s+and\s+comprehensive\s+(?:income|loss))?|cash flows?))$/i;
const NUMBER_TOKEN = /(?:\(?\$?-?\d[\d,]*(?:\.\d+)?%?\)?|(?<!\S)[-–—](?!\S))/g;

function normalize(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

function looksLikeTableRow(line: string): boolean {
  const numbers = line.match(NUMBER_TOKEN) ?? [];
  const isPeriodHeader = /\b(?:years? ended|as of)\b/i.test(line);
  return !isPeriodHeader && numbers.length >= 2 && normalize(line).length >= 8;
}

function inferColumns(header: string): string[] {
  const years = header.match(/(?:19|20)\d{2}/g);
  if (years && years.length >= 2) return Array.from(new Set(years));
  return ['Period 1', 'Period 2'];
}

function tableTitle(lines: string[], index: number): string {
  for (let i = index; i >= 0; i -= 1) {
    if (PRIMARY_TABLE_HEADING.test(lines[i])) return normalize(lines[i]);
  }
  return 'Financial statement table';
}

function unitScale(lines: string[], index: number): string | undefined {
  const nearby = lines.slice(Math.max(0, index - 6), index + 1).join(' ');
  const match = /\b(?:in\s+)?(thousands|millions|billions)\b(?:,?\s+except\s+[^)]*)?/i.exec(nearby);
  return match ? normalize(match[0]) : undefined;
}

function parseRow(line: string, columnCount: number): { label: string; values: string[] } | null {
  const compactCurrency = line.replace(/\$\s+(?=\(?-?\d)/g, '$');
  const matches = Array.from(compactCurrency.matchAll(NUMBER_TOKEN));
  if (matches.length < columnCount || columnCount < 2) return null;
  const values = matches.slice(-columnCount).map((match) => match[0]);
  const firstValueIndex = matches[matches.length - columnCount].index ?? 0;
  const label = normalize(compactCurrency.slice(0, firstValueIndex))
    .replace(/^[.\s]+/, '')
    .replace(/\s+\$$/, '');
  if (!label) return null;
  if (label.endsWith(',')) return null;
  if (/\b(?:shares? authorized|shares? issued|par value)\b/i.test(label)) return null;
  return { label, values };
}

export function extractFinancialTableChunks(pages: RawPage[], sectionMap: Map<number, string>): Chunk[] {
  const chunks: Chunk[] = [];
  let counter = 0;

  for (const page of pages) {
    if (sectionMap.get(page.pageNumber) !== 'Financial Statements') continue;
    const lines = page.text.split(/\r?\n/).map(normalize).filter(Boolean);
    const headingIndex = lines.findIndex((line) => PRIMARY_TABLE_HEADING.test(line));
    if (headingIndex < 0) continue;
    const pageUnitScale = unitScale(lines, Math.min(lines.length - 1, headingIndex + 6));
    for (let i = 0; i < lines.length; i += 1) {
      if (!looksLikeTableRow(lines[i])) continue;
      const rows = [lines[i]];
      let j = i + 1;
      while (j < lines.length && rows.length < 12 && looksLikeTableRow(lines[j])) {
        rows.push(lines[j]);
        j += 1;
      }
      const header = lines.slice(headingIndex, i + 1).join(' ');
      const columns = inferColumns(header);
      const parsedRows = rows.map((row) => parseRow(row, columns.length)).filter((row): row is NonNullable<typeof row> => row !== null);
      if (parsedRows.length === 0) continue;
      const metadata: TableMetadata = {
        title: tableTitle(lines, i),
        columns,
        rowLabel: parsedRows[0]?.label,
        unitScale: pageUnitScale,
        rows: parsedRows,
      };
      chunks.push({
        id: `table-${counter++}`,
        text: rows.join('\n'),
        page: page.pageNumber,
        kind: 'table',
        table: metadata,
      });
      i = j - 1;
    }
  }

  return chunks;
}
