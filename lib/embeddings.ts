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

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await getClient().embeddings.create({
    model: 'gemini-embedding-001',
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}
