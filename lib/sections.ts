import type { RawPage, Chunk } from './chunk';

export const ALLOWED_SECTIONS = ['Risk Factors', 'Legal Proceedings', 'MD&A'] as const;

const SECTION_PATTERNS: Array<[RegExp, string]> = [
  [/item\s*1a\.?\s*risk factors/i, 'Risk Factors'],
  [/item\s*3\.?\s*legal proceedings/i, 'Legal Proceedings'],
  [/item\s*7\.?\s*management.?s discussion/i, 'MD&A'],
];

export function sectionsForPages(pages: RawPage[]): Map<number, string> {
  const map = new Map<number, string>();
  let current = 'Unknown';

  for (const page of pages) {
    for (const [pattern, label] of SECTION_PATTERNS) {
      if (pattern.test(page.text)) {
        current = label;
        break;
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
