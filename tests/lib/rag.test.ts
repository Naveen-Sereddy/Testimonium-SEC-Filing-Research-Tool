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
import {
  processUpload,
  processUploads,
  answerQuestion,
  confidenceLabel,
  explainRetrieval,
  InvalidFilingPairError,
  NoNarrativeSectionsError,
} from '../../lib/rag';

describe('explainRetrieval', () => {
  it('reports no indexed content when nothing was retrieved', () => {
    expect(explainRetrieval(0, 0, [], true)).toBe('No indexed content was available to search for this question.');
  });

  it('names the sections and passage count for a well-supported answer', () => {
    const text = explainRetrieval(5, 3, ['Risk Factors', 'MD&A'], false);
    expect(text).toContain('5 passages');
    expect(text).toContain('Risk Factors, MD&A');
    expect(text).toContain('3');
  });

  it('uses singular "passage" for a single result', () => {
    expect(explainRetrieval(1, 1, ['Risk Factors'], false)).toContain('1 passage from');
  });

  it('flags weak matches distinctly from strong ones on a real answer', () => {
    const text = explainRetrieval(5, 0, ['Risk Factors'], false);
    expect(text).toContain("but none matched closely");
  });

  it('distinguishes a refusal with some signal from a refusal with none', () => {
    const withSignal = explainRetrieval(5, 1, ['Risk Factors'], true);
    const withNone = explainRetrieval(5, 0, ['Risk Factors'], true);
    expect(withSignal).toContain('none of them directly answered');
    expect(withNone).toContain('none closely related');
  });
});

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

  it('stores two filings in one session with document metadata for comparison', async () => {
    vi.mocked(extractPages)
      .mockResolvedValueOnce([{ pageNumber: 1, text: 'Form 10-K\nItem 1A. Risk Factors\n' + 'a'.repeat(50) }])
      .mockResolvedValueOnce([{ pageNumber: 1, text: 'Form 10-K\nItem 1A. Risk Factors\n' + 'b'.repeat(50) }]);
    vi.mocked(embedTexts).mockResolvedValue([[0.1, 0.2]]);

    const result = await (await import('../../lib/rag')).processUploads([
      { buffer: Buffer.from('prior'), fileName: '2024.pdf' },
      { buffer: Buffer.from('current'), fileName: '2025.pdf' },
    ]);

    expect(result.documents).toHaveLength(2);
    expect(result.documents?.map((document) => document.fileName)).toEqual(['2024.pdf', '2025.pdf']);
    const { getAllChunks } = await import('../../lib/store');
    expect(await getAllChunks(result.sessionId)).toHaveLength(2);
  });

  it('rejects filings from different companies before requesting embeddings', async () => {
    const filing = (company: string, year: number) => [
      {
        pageNumber: 1,
        text: `${company}\n(Exact name of registrant as specified in its charter)\nFor the fiscal year ended December 31, ${year}\nItem 1A. Risk Factors\n${'risk '.repeat(20)}`,
      },
    ];

    await expect(
      processUploads([
        { buffer: Buffer.from('left'), fileName: 'left.pdf', pages: filing('Acme Corp', 2024) },
        { buffer: Buffer.from('right'), fileName: 'right.pdf', pages: filing('Other Corp', 2025) },
      ]),
    ).rejects.toThrow(InvalidFilingPairError);
    expect(embedTexts).not.toHaveBeenCalled();
  });

  it('rejects two filings for the same fiscal year', async () => {
    const filing = (year: number) => [
      {
        pageNumber: 1,
        text: `Acme Corp\n(Exact name of registrant as specified in its charter)\nFor the fiscal year ended December 31, ${year}\nItem 1A. Risk Factors\n${'risk '.repeat(20)}`,
      },
    ];

    await expect(
      processUploads([
        { buffer: Buffer.from('left'), fileName: 'left.pdf', pages: filing(2025) },
        { buffer: Buffer.from('right'), fileName: 'right.pdf', pages: filing(2025) },
      ]),
    ).rejects.toThrow('Choose filings from two different fiscal years');
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
      { id: 1, chunkId: 'chunk-0', page: 12, section: 'Risk Factors', excerpt: 'x'.repeat(200) },
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
    vi.mocked(askModel)
      .mockResolvedValueOnce('Answer [1] [2] [3].')
      .mockResolvedValueOnce('Answer [1] [2] [3] [4] [5] [6].');

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

  it('withholds an answer when the model supplies no verifiable citations', async () => {
    const { addChunks } = await import('../../lib/store');
    await addChunks(SESSION, [
      { id: 'chunk-0', text: 'Grounded source text.', page: 4, section: 'Risk Factors', embedding: [1, 0] },
    ]);
    vi.mocked(embedTexts).mockResolvedValue([[1, 0]]);
    vi.mocked(askModel).mockResolvedValue('A claim without a citation.');

    const result = await answerQuestion(SESSION, 'What risk is disclosed?');
    expect(result.answer).toBe("I don't know based on the provided document.");
    expect(result.citations).toEqual([]);
    expect(result.confidence).toBe('Low');
  });

  it('withholds an answer containing an invalid citation id', async () => {
    const { addChunks } = await import('../../lib/store');
    await addChunks(SESSION, [
      { id: 'chunk-0', text: 'Grounded source text.', page: 4, section: 'Risk Factors', embedding: [1, 0] },
    ]);
    vi.mocked(embedTexts).mockResolvedValue([[1, 0]]);
    vi.mocked(askModel).mockResolvedValue('Unsupported mapping [9].');

    const result = await answerQuestion(SESSION, 'What risk is disclosed?');
    expect(result.citations).toEqual([]);
    expect(result.confidence).toBe('Low');
  });

  it('refuses explicit investment advice without calling the model', async () => {
    const { addChunks } = await import('../../lib/store');
    await addChunks(SESSION, [
      { id: 'chunk-0', text: 'Risk disclosure.', page: 4, section: 'Risk Factors', embedding: [1, 0] },
    ]);

    const result = await answerQuestion(SESSION, 'Should I buy this stock?');
    expect(result.confidence).toBe('Low');
    expect(result.citations).toEqual([]);
    expect(embedTexts).not.toHaveBeenCalled();
    expect(askModel).not.toHaveBeenCalled();
  });

  it('refuses a question for a target section that was not indexed', async () => {
    const { addChunks } = await import('../../lib/store');
    await addChunks(SESSION, [
      { id: 'chunk-0', text: 'Risk disclosure.', page: 4, section: 'Risk Factors', embedding: [1, 0] },
    ]);

    const result = await answerQuestion(SESSION, 'Summarize the MD&A section.');
    expect(result.confidence).toBe('Low');
    expect(result.citations).toEqual([]);
    expect(result.explanation).toContain('MD&A was not available');
    expect(askModel).not.toHaveBeenCalled();
  });
});
