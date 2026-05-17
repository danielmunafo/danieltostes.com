import type { RetrievedEvidenceChunk } from "./types.js";

/**
 * Merges per-query top hits, keeping the best score per chunk id (same semantics as
 * `retrieveMergedTopK` in `rag/retrieve.ts`).
 */
export function mergeRetrievalResults(
  resultsPerQuery: readonly (readonly RetrievedEvidenceChunk[])[],
  topK: number
): RetrievedEvidenceChunk[] {
  if (resultsPerQuery.length === 0) return [];
  const flat = resultsPerQuery.flat();
  if (flat.length === 0) return [];

  if (resultsPerQuery.length === 1) {
    return sortAndSlice(resultsPerQuery[0], topK);
  }

  const perQueryK = Math.max(1, Math.ceil(topK / resultsPerQuery.length));
  const byId = new Map<string, RetrievedEvidenceChunk>();

  for (const queryHits of resultsPerQuery) {
    for (const hit of sortAndSlice(queryHits, perQueryK)) {
      const score = hit.score ?? 0;
      const existing = byId.get(hit.id);
      if (!existing || (existing.score ?? 0) < score) {
        byId.set(hit.id, hit);
      }
    }
  }

  return sortAndSlice([...byId.values()], topK);
}

function sortAndSlice(
  hits: readonly RetrievedEvidenceChunk[],
  topK: number
): RetrievedEvidenceChunk[] {
  return [...hits]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, topK);
}
