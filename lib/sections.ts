import type { RawPage, Chunk } from './chunk';

export const ALLOWED_SECTIONS = ['Risk Factors', 'Legal Proceedings', 'MD&A'] as const;

const SECTION_PATTERNS: Array<[RegExp, string]> = [
  [/item\s*1a\s*[.:\-–—]?\s*risk factors/i, 'Risk Factors'],
  [/item\s*3\s*[.:\-–—]?\s*legal proceedings/i, 'Legal Proceedings'],
  [/item\s*7\s*[.:\-–—]?\s*management.?s discussion/i, 'MD&A'],
];

const TOC_PATTERN = /item\s*\d+[a-z]?\b/gi;

function isTableOfContents(pageText: string): boolean {
  const matches = pageText.match(TOC_PATTERN);
  return (matches?.length ?? 0) >= 2;
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
