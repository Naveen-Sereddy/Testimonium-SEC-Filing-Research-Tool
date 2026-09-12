import type { TableMetadata } from './chunk';

const VALUE = /(?:\$\s*)?\(?-?\d[\d,]*(?:\.\d+)?\)?%?|—|N\/A/gi;
const COMPARISON_COLUMNS = ['Period 1', 'Period 2', 'Change', 'Change %'];
const OPERATIONS_COLUMNS = ['Net revenue', 'Cost of revenue', 'Gross profit/(loss)', 'Gross margin/(loss)'];

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function rowFromLine(line: string): { label: string; values: string[] } | null {
  const matches = Array.from(line.matchAll(VALUE));
  if (matches.length < 2) return null;
  const first = matches[0];
  const label = compact(line.slice(0, first.index ?? 0)).replace(/[.\s]+$/, '');
  if (!/[A-Za-z]/.test(label)) return null;
  const values = matches.map((match) => compact(match[0]));
  return { label, values };
}

/**
 * Preserve useful structure when a financial comparison was extracted as
 * ordinary MD&A prose rather than as an Item 8 statement table. PDF text
 * often loses the visual grid but retains row order and values, so this is
 * intentionally conservative: it only upgrades a passage with two or more
 * recognisable numeric rows.
 */
export function tableFromExcerpt(text: string): TableMetadata | null {
  const lines = text.split(/\r?\n/).map(compact).filter(Boolean);
  const rows = lines.map(rowFromLine).filter((row): row is NonNullable<typeof row> => row !== null);
  if (rows.length < 2) return null;

  const columnCount = Math.max(...rows.map((row) => row.values.length));
  if (columnCount < 2 || columnCount > 4) return null;

  const years = lines.flatMap((line) => line.match(/\b(?:19|20)\d{2}\b/g) ?? []);
  const headerText = lines.slice(0, 4).join(' ');
  const hasOperationsHeader = /net\s+revenue/i.test(headerText) && /cost/i.test(headerText) && /gross/i.test(headerText);
  const columns = hasOperationsHeader && columnCount === 4
    ? OPERATIONS_COLUMNS
    : years.length >= columnCount
      ? years.slice(0, columnCount)
      : columnCount === 4
        ? COMPARISON_COLUMNS
        : Array.from({ length: columnCount }, (_, index) => `Period ${index + 1}`);

  const titleLine = lines.find((line) => /(?:results? of operations|net revenue|cost of revenue|gross profit|gross loss)/i.test(line));
  return {
    title: titleLine && !/^[\d$(),.%\s]+$/.test(titleLine) ? titleLine : 'Financial comparison excerpt',
    columns,
    rows: rows.slice(0, 12).map((row) => ({ label: row.label, values: row.values.slice(-columnCount) })),
  };
}
