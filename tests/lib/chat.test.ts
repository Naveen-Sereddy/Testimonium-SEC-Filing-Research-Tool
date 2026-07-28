import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildPrompt } from '../../lib/chat';

const createMock = vi.fn();

vi.mock('openai', () => ({
  default: class {
    chat = { completions: { create: createMock } };
  },
}));

describe('buildPrompt', () => {
  it('includes numbered context blocks with page/section metadata and the citation instruction', () => {
    const prompt = buildPrompt('What is our credit risk exposure?', [
      { index: 1, text: 'Exposure to consumer credit risk is significant.', page: 12, section: 'Risk Factors' },
    ]);
    expect(prompt).toContain('[1] (Page 12, Risk Factors)');
    expect(prompt).toContain('Exposure to consumer credit risk is significant.');
    expect(prompt).toContain('Cite sources inline as [N]');
    expect(prompt).toContain("I don't know based on the provided document.");
    expect(prompt).toContain('What is our credit risk exposure?');
  });
});

describe('askModel', () => {
  beforeEach(() => createMock.mockReset());

  it('sends the built prompt to gemini-flash-latest and returns the response content', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: 'Answer with citation [1].' } }],
    });
    const { askModel } = await import('../../lib/chat');
    const result = await askModel('question', [{ index: 1, text: 'ctx', page: 1, section: 'Risk Factors' }]);
    expect(result).toBe('Answer with citation [1].');
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-flash-latest', temperature: 0.2 }),
    );
  });

  it('falls back to the "I don\'t know" string if the API returns no content', async () => {
    createMock.mockResolvedValue({ choices: [{ message: { content: null } }] });
    const { askModel } = await import('../../lib/chat');
    const result = await askModel('question', []);
    expect(result).toBe("I don't know based on the provided document.");
  });
});
