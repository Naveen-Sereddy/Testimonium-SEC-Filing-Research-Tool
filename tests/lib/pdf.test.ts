import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { extractPages } from '../../lib/pdf';

const fixturePath = path.join(__dirname, 'fixtures', 'sample.pdf');

beforeAll(async () => {
  mkdirSync(path.dirname(fixturePath), { recursive: true });
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  const page1 = doc.addPage([600, 800]);
  page1.drawText('Item 1A. Risk Factors', { x: 50, y: 750, size: 14, font });
  page1.drawText('Our exposure to consumer credit risk is significant.', { x: 50, y: 700, size: 12, font });

  const page2 = doc.addPage([600, 800]);
  page2.drawText('Item 3. Legal Proceedings', { x: 50, y: 750, size: 14, font });
  page2.drawText('We are subject to various claims in the ordinary course of business.', {
    x: 50,
    y: 700,
    size: 12,
    font,
  });

  const bytes = await doc.save();
  writeFileSync(fixturePath, bytes);
});

describe('extractPages', () => {
  it('returns one RawPage per PDF page with 1-based numbering and correct text', async () => {
    const buffer = readFileSync(fixturePath);
    const pages = await extractPages(buffer);
    expect(pages.length).toBe(2);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].text).toContain('Risk Factors');
    expect(pages[1].pageNumber).toBe(2);
    expect(pages[1].text).toContain('Legal Proceedings');
  });

  it('does not leak text across pages', async () => {
    const buffer = readFileSync(fixturePath);
    const pages = await extractPages(buffer);
    expect(pages[0].text).not.toContain('Legal Proceedings');
    expect(pages[1].text).not.toContain('Risk Factors');
  });
});
