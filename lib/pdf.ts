import { PDFParse } from 'pdf-parse';
import type { RawPage } from './chunk';

/**
 * Extract text from a PDF buffer, one RawPage per PDF page with 1-based page numbers.
 *
 * Note: the installed `pdf-parse` (v2, mehmet-kozan rewrite) exposes a `PDFParse` class
 * with a `getText()` method returning `{ pages: [{ num, text }] }` — it does not have the
 * classic v1 `pagerender` callback option.
 */
export async function extractPages(buffer: Buffer): Promise<RawPage[]> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => ({ pageNumber: page.num, text: page.text }));
  } finally {
    await parser.destroy();
  }
}
