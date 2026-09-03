export interface RawPage {
  pageNumber: number;
  text: string;
}

export interface Chunk {
  id: string;
  text: string;
  page: number;
  /** Content type is optional for backwards compatibility with existing fixtures. */
  kind?: 'prose' | 'table';
  table?: TableMetadata;
}

export interface TableMetadata {
  title: string;
  columns: string[];
  rowLabel?: string;
  unitScale?: string;
  rows?: Array<{ label: string; values: string[] }>;
}

export function chunkPages(pages: RawPage[], chunkSize = 1000, overlap = 200): Chunk[] {
  const chunks: Chunk[] = [];
  let idCounter = 0;

  for (const page of pages) {
    const text = page.text;
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const slice = text.slice(start, end);

      if (slice.trim().length > 0) {
        chunks.push({ id: `chunk-${idCounter++}`, text: slice, page: page.pageNumber });
      }

      if (end === text.length) break;
      start = end - overlap;
    }
  }

  return chunks;
}
