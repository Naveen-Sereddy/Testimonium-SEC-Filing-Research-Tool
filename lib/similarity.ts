export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface Scored<T> {
  item: T;
  score: number;
}

export function topK<T>(items: T[], embeddings: number[][], queryEmbedding: number[], k: number): Scored<T>[] {
  const scored = items.map((item, i) => ({
    item,
    score: cosineSimilarity(embeddings[i], queryEmbedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}
