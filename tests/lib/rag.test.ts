import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetStore } from '../../lib/store';

vi.mock('../../lib/pdf', () => ({
  extractPages: vi.fn(),
}));
vi.mock('../../lib/embeddings', () => ({
  embedTexts: vi.fn(),
}));
vi.mock('../../lib/chat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/chat')>();
  return { ...actual, askModel: vi.fn() };
});

import { extractPages } from '../../lib/pdf';
import { embedTexts } from '../../lib/embeddings';
import { askModel } from '../../lib/chat';
import { processUpload, answerQuestion, confidenceLabel, NoNarrativeSectionsError } from '../../lib/rag';

describe('processUpload', () => {
  beforeEach(() => {
    vi.mocked(extractPages).mockReset();
    vi.mocked(embedTexts).mockReset();
  });

  it('extracts, chunks, filters to narrative sections, embeds, and stores the chunks', async () => {
    vi.mocked(extractPages).mockResolvedValue([
      { pageNumber: 1, text: 'Item 1A. Risk Factors\n' + 'a'.repeat(50) },
    ]);
    vi.mocked(embedTexts).mockResolvedValue([[0.1, 0.2]]);

    const result = await processUpload(Buffer.from('fake-pdf-bytes'));

    expect(result.pageCount).toBe(1);
    expect(result.chunkCount).toBe(1);
    expect(result.sessionId).toEqual(expect.any(String));
    expect(result.indexedSections).toEqual(['Risk Factors']);
    expect(embedTexts).toHaveBeenCalled();
  });

  it('throws NoNarrativeSectionsError when no allowed section is detected', async () => {
    vi.mocked(extractPages).mockResolvedValue([{ pageNumber: 1, text: 'Cover page only.' }]);
    await expect(processUpload(Buffer.from('fake'))).rejects.toThrow(NoNarrativeSectionsError);
  });
});

describe('confidenceLabel', () => {
  it('returns High when at least 3 scores are >= 0.85', () => {
    expect(confidenceLabel([0.9, 0.88, 0.86, 0.5])).toBe('High');
  });

  it('returns Medium when top score is between 0.60 and 0.85 without 3 strong matches', () => {
    expect(confidenceLabel([0.7, 0.5])).toBe('Medium');
  });

  it('returns Low when top score is below 0.60', () => {
    expect(confidenceLabel([0.4, 0.2])).toBe('Low');
  });

  it('returns Low for an empty score list', () => {
    expect(confidenceLabel([])).toBe('Low');
  });
});

describe('answerQuestion', () => {
  const SESSION = 'test-session';

  beforeEach(async () => {
    await resetStore(SESSION);
    vi.mocked(embedTexts).mockReset();
    vi.mocked(askModel).mockReset();
  });

  it('returns the fallback answer with no citations when the session has no stored chunks', async () => {
    vi.mocked(embedTexts).mockResolvedValue([[0.1, 0.2]]);
    const result = await answerQuestion(SESSION, 'What is our risk?');
    expect(result.citations).toEqual([]);
    expect(result.answer).toBe("I don't know based on the provided document.");
    expect(result.confidence).toBe('Low');
    expect(embedTexts).not.toHaveBeenCalled();
    expect(askModel).not.toHaveBeenCalled();
  });

  it('retrieves top chunks, asks the model, and returns numbered citations with truncated excerpts', async () => {
    const { addChunks } = await import('../../lib/store');
    await addChunks(SESSION, [
      {
        id: 'chunk-0',
        text: 'x'.repeat(300),
        page: 12,
        section: 'Risk Factors',
        embedding: [1, 0],
      },
    ]);
    vi.mocked(embedTexts).mockResolvedValue([[1, 0]]);
    vi.mocked(askModel).mockResolvedValue('Answer citing [1].');

    const result = await answerQuestion(SESSION, 'What is our risk?');

    expect(result.answer).toBe('Answer citing [1].');
    expect(result.citations).toEqual([
      { id: 1, page: 12, section: 'Risk Factors', excerpt: 'x'.repeat(200) },
    ]);
    expect(result.confidence).toBe('Medium');
  });

  it('respects a custom k, retrieving fewer or more chunks than the default', async () => {
    const { addChunks } = await import('../../lib/store');
    await addChunks(
      SESSION,
      Array.from({ length: 6 }, (_, i) => ({
        id: `chunk-${i}`,
        text: `text ${i}`,
        page: i + 1,
        section: 'Risk Factors',
        embedding: [1, 0],
      })),
    );
    vi.mocked(embedTexts).mockResolvedValue([[1, 0]]);
    vi.mocked(askModel).mockResolvedValue('Answer.');

    const brief = await answerQuestion(SESSION, 'What is our risk?', 3);
    expect(brief.citations).toHaveLength(3);

    const detailed = await answerQuestion(SESSION, 'What is our risk?', 6);
    expect(detailed.citations).toHaveLength(6);
  });

  it('forces Low confidence and no citations when the model refuses, even with strong retrieval scores', async () => {
    const { addChunks } = await import('../../lib/store');
    await addChunks(SESSION, [
      { id: 'chunk-0', text: 'x'.repeat(300), page: 12, section: 'Risk Factors', embedding: [1, 0] },
      { id: 'chunk-1', text: 'y'.repeat(300), page: 13, section: 'Risk Factors', embedding: [1, 0] },
      { id: 'chunk-2', text: 'z'.repeat(300), page: 14, section: 'Risk Factors', embedding: [1, 0] },
    ]);
    vi.mocked(embedTexts).mockResolvedValue([[1, 0]]);
    vi.mocked(askModel).mockResolvedValue("I don't know based on the provided document.");

    const result = await answerQuestion(SESSION, 'Summarize key findings');

    expect(result.answer).toBe("I don't know based on the provided document.");
    expect(result.citations).toEqual([]);
    expect(result.confidence).toBe('Low');
  });
});
