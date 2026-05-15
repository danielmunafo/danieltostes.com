export interface EmbeddingChunk {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, string>;
}

export interface EmbeddingsFile {
  model: string;
  version: string;
  chunks: EmbeddingChunk[];
}

/**
 * Keeps RAG + References aligned with the recruiter's selected site language
 * (`metadata.locale` on embedding chunks from `build-embeddings.mjs`).
 * Falls back to the full corpus only when no chunk declares that locale (legacy files).
 */
export function filterChunksByNavigationLocale(
  chunks: readonly EmbeddingChunk[],
  locale: string
): readonly EmbeddingChunk[] {
  const target = locale.trim();
  if (!target) return chunks;
  const matched = chunks.filter((c) => c.metadata?.locale === target);
  return matched.length > 0 ? matched : chunks;
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function norm(a: number[]): number {
  return Math.sqrt(dotProduct(a, a));
}

/** Cosine similarity between two vectors. Returns 0 when either vector is zero. */
export function cosineSimilarity(a: number[], b: number[]): number {
  const denom = norm(a) * norm(b);
  if (denom === 0) return 0;
  return dotProduct(a, b) / denom;
}

/**
 * Returns the top-K chunks by cosine similarity to the query embedding.
 */
export function retrieveTopK(
  chunks: readonly EmbeddingChunk[],
  queryEmbedding: number[],
  topK: number
): EmbeddingChunk[] {
  const scored = chunks.map((chunk) => ({
    chunk,
    score: cosineSimilarity(chunk.embedding, queryEmbedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((s) => s.chunk);
}

/**
 * Merges top-K results from multiple query embeddings, keeping the best score per chunk id.
 */
export function retrieveMergedTopK(
  chunks: readonly EmbeddingChunk[],
  queryEmbeddings: readonly number[][],
  topK: number
): EmbeddingChunk[] {
  if (queryEmbeddings.length === 0) return [];
  if (queryEmbeddings.length === 1) {
    return retrieveTopK(chunks, queryEmbeddings[0], topK);
  }

  const perQueryK = Math.max(1, Math.ceil(topK / queryEmbeddings.length));
  const byId = new Map<string, { chunk: EmbeddingChunk; score: number }>();

  for (const queryEmbedding of queryEmbeddings) {
    const scored = chunks.map((chunk) => ({
      chunk,
      score: cosineSimilarity(chunk.embedding, queryEmbedding),
    }));
    scored.sort((a, b) => b.score - a.score);
    for (const { chunk, score } of scored.slice(0, perQueryK)) {
      const existing = byId.get(chunk.id);
      if (!existing || score > existing.score) {
        byId.set(chunk.id, { chunk, score });
      }
    }
  }

  return [...byId.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((entry) => entry.chunk);
}
