import {
  VectorStoreQueryMode,
  type MetadataFilters,
  type SimpleVectorStore,
} from "llamaindex";
import type { EmbeddingChunk } from "../../rag/retrieve.js";
import type { RecruiterNavLocale, RetrievedEvidenceChunk } from "../types.js";
import { toRetrievedEvidenceChunk } from "../normalizeEvidence.js";

const chunkByIdCache = new WeakMap<
  readonly EmbeddingChunk[],
  Map<string, EmbeddingChunk>
>();

function chunkLookup(
  chunks: readonly EmbeddingChunk[]
): Map<string, EmbeddingChunk> {
  let map = chunkByIdCache.get(chunks);
  if (!map) {
    map = new Map(chunks.map((c) => [c.id, c]));
    chunkByIdCache.set(chunks, map);
  }
  return map;
}

export async function queryVectorStorePerEmbedding(
  store: SimpleVectorStore,
  corpusChunks: readonly EmbeddingChunk[],
  queryEmbeddings: readonly number[][],
  perQueryK: number,
  navLocale: RecruiterNavLocale,
  filters?: MetadataFilters
): Promise<RetrievedEvidenceChunk[][]> {
  const byId = chunkLookup(corpusChunks);
  const results: RetrievedEvidenceChunk[][] = [];

  for (const queryEmbedding of queryEmbeddings) {
    const queryResult = await store.query({
      queryEmbedding,
      similarityTopK: perQueryK,
      mode: VectorStoreQueryMode.DEFAULT,
      filters,
    });
    const hits: RetrievedEvidenceChunk[] = [];
    const ids = queryResult.ids ?? [];
    const similarities = queryResult.similarities ?? [];
    for (let i = 0; i < ids.length; i++) {
      const chunkId = ids[i];
      const chunk = byId.get(chunkId);
      if (!chunk) continue;
      hits.push(
        toRetrievedEvidenceChunk(
          chunk,
          navLocale,
          "llamaindex",
          similarities[i] ?? null
        )
      );
    }
    results.push(hits);
  }

  return results;
}
