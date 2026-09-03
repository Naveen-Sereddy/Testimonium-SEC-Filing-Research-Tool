import type { RawPage, Chunk } from './chunk';

export const ALLOWED_SECTIONS = ['Risk Factors', 'Legal Proceedings', 'MD&A'] as const;
export const TABLE_SECTION = 'Financial Statements' as const;

const SECTION_PATTERNS: Array<[RegExp, string]> = [
  [/item\s*1a\s*[.:\-–—]?\s*risk factors/i, 'Risk Factors'],
  [/item\s*3\s*[.:\-–—]?\s*legal proceedings/i, 'Legal Proceedings'],
  [/item\s*7\s*[.:\-–—]?\s*management.?s discussion/i, 'MD&A'],
  [/item\s*8\s*[.:\-–—]?\s*(?:financial statements|financial data)/i, TABLE_SECTION],
];

function isTableOfContents(pageText: string): boolean {
  // ToC rows have "Item N. Heading .... pagenum" pattern (dot leaders or collapsed whitespace + digits)
  // This distinguishes them from prose cross-references like "as discussed in Item 7 above"
  const tocRowPattern = /item\s*\d{1,2}[a-z]?\.?\s*[^\n]{0,60}?[.\s]{2,}\d{1,4}\b/gi;
  const matches = pageText.match(tocRowPattern) ?? [];
  return matches.length >= 2;
}

export function sectionsForPages(pages: RawPage[]): Map<number, string> {
  const map = new Map<number, string>();
  let current = 'Unknown';

  for (const page of pages) {
    // Skip updating current section if this is a ToC/index page
    if (!isTableOfContents(page.text)) {
      for (const [pattern, label] of SECTION_PATTERNS) {
        if (pattern.test(page.text)) {
          current = label;
          break;
        }
      }
    }
    map.set(page.pageNumber, current);
  }

  return map;
}

export function tagAndFilterChunks(
  chunks: Chunk[],
  sectionMap: Map<number, string>,
): Array<Chunk & { section: string }> {
  return chunks
    .map((chunk) => ({ ...chunk, section: sectionMap.get(chunk.page) ?? 'Unknown' }))
    .filter((chunk) => (ALLOWED_SECTIONS as readonly string[]).includes(chunk.section));
}

export function sectionLabelForChunk(section: string, kind: 'prose' | 'table' = 'prose'): string {
  return kind === 'table' ? TABLE_SECTION : section;
}
