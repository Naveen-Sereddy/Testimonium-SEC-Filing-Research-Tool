import type { RawPage } from './chunk';

/**
 * Extract text from a PDF buffer, one RawPage per PDF page with 1-based page numbers.
 *
 * Note: the installed `pdf-parse` (v2, mehmet-kozan rewrite) exposes a `PDFParse` class
 * with a `getText()` method returning `{ pages: [{ num, text }] }` — it does not have the
 * classic v1 `pagerender` callback option.
 *
 * `pdf-parse` always loads pdfjs-dist's browser-targeted "legacy" build, which references
 * the DOM-only `DOMMatrix` global at module scope. Node has no such global, so it must be
 * polyfilled before that module is ever imported — hence the dynamic import below instead
 * of a static one (static imports are hoisted ahead of this file's own top-level code).
 */
async function ensureDomMatrixPolyfill() {
  if (typeof (globalThis as { DOMMatrix?: unknown }).DOMMatrix === 'undefined') {
    const DOMMatrixPolyfill = (await import('dommatrix')).default;
    (globalThis as { DOMMatrix?: unknown }).DOMMatrix = DOMMatrixPolyfill;
  }
}

export async function extractPages(buffer: Buffer): Promise<RawPage[]> {
  await ensureDomMatrixPolyfill();
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.pages.map((page) => ({ pageNumber: page.num, text: page.text }));
  } finally {
    await parser.destroy();
  }
}
