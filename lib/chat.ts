import OpenAI from 'openai';

let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.GEMINI_API_KEY,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    });
  }
  return client;
}

export interface ContextChunk {
  index: number;
  text: string;
  page: number;
  section: string;
}

export const FALLBACK = "I don't know based on the provided document.";

export function buildPrompt(question: string, context: ContextChunk[]): string {
  const contextBlock = context.map((c) => `[${c.index}] (Page ${c.page}, ${c.section})\n${c.text}`).join('\n\n');

  return [
    'Answer the question using only the context below. Cite sources inline as [N] matching the numbered context blocks.',
    `If the context does not contain enough information to answer, respond exactly: "${FALLBACK}"`,
    '',
    `Context:\n${contextBlock}`,
    '',
    `Question: ${question}`,
  ].join('\n');
}

export async function askModel(question: string, context: ContextChunk[]): Promise<string> {
  const prompt = buildPrompt(question, context);
  const response = await getClient().chat.completions.create({
    model: 'gemini-flash-latest',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  });
  return response.choices[0]?.message?.content ?? FALLBACK;
}
