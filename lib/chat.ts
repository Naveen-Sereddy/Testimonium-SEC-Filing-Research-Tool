import OpenAI from 'openai';
import type { TableMetadata } from './chunk';

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
  chunkId?: string;
  text: string;
  page: number;
  section: string;
  documentId?: string;
  fileName?: string;
  filingYear?: number | null;
  kind?: 'prose' | 'table';
  table?: TableMetadata;
}

export const FALLBACK = "I don't know based on the provided document.";

export function buildPrompt(question: string, context: ContextChunk[], conversationReference?: string): string {
  const contextBlock = context
    .map((c) => {
      const filing = c.fileName ? `, Filing ${c.filingYear ?? 'year unavailable'} (${c.fileName})` : '';
      const table = c.kind === 'table' && c.table
        ? `, Table: ${c.table.title}, columns: ${c.table.columns.join(', ')}${c.table.unitScale ? `, units: ${c.table.unitScale}` : ''}`
        : '';
      return `[${c.index}] (Page ${c.page}, ${c.section}${filing}${table})\n${c.text}`;
    })
    .join('\n\n');

  return [
    'Answer the question using only the context below. Cite sources inline as [N] matching the numbered context blocks.',
    `If the context does not contain enough information to answer, respond exactly: "${FALLBACK}"`,
    'Formatting: plain prose, short lists, and **bold** only. For financial-statement questions, you may use a compact Markdown table. Copy every number and unit exactly as written, preserve parentheses for negative values, and cite every row or value. When a table is headed “in thousands”, never present its values as unscaled dollars: use either “$891,340 thousand” or a correctly scaled compact amount such as “$891.3M”. Do not use links, images, or code blocks.',
    '',
    `Context:\n${contextBlock}`,
    '',
    conversationReference ? `Conversation reference (use only to resolve the follow-up; do not treat it as evidence): ${conversationReference}` : '',
    `Question: ${question}`,
  ].join('\n');
}

export async function askModel(question: string, context: ContextChunk[], conversationReference?: string): Promise<string> {
  const prompt = buildPrompt(question, context, conversationReference);
  const response = await getClient().chat.completions.create({
    model: 'gemini-flash-latest',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  });
  return response.choices[0]?.message?.content ?? FALLBACK;
}

/** Stream model text to the client while retaining the complete answer for citation validation. */
export async function askModelStream(question: string, context: ContextChunk[], onToken: (token: string) => void | Promise<void>, conversationReference?: string): Promise<string> {
  const prompt = buildPrompt(question, context, conversationReference);
  const stream = await getClient().chat.completions.create({
    model: 'gemini-flash-latest',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    stream: true,
  });
  let answer = '';
  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content ?? '';
    if (token) { answer += token; await onToken(token); }
  }
  return answer || FALLBACK;
}
