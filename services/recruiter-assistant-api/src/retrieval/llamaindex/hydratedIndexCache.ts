import { SimpleVectorStore } from "llamaindex";
import { loadEmbeddingsFile } from "../../embeddings/loadEmbeddings.js";
import { filterChunksByNavigationLocale } from "../../rag/retrieve.js";
import type { RecruiterNavLocale } from "../../constants.js";
import { buildVectorStoreFromChunks } from "./buildVectorStoreFromChunks.js";

type HydratedIndexEntry = {
  cacheKey: string;
  store: SimpleVectorStore;
  chunksForNavLocale: readonly import("../../rag/retrieve.js").EmbeddingChunk[];
};

let hydratedEntry: HydratedIndexEntry | null = null;

export async function getHydratedVectorStoreForLocale(
  navLocale: RecruiterNavLocale
): Promise<{
  store: SimpleVectorStore;
  chunksForNavLocale: readonly import("../../rag/retrieve.js").EmbeddingChunk[];
}> {
  const embeddingsFile = await loadEmbeddingsFile();
  const cacheKey = `${embeddingsFile.version}|${navLocale}`;
  if (hydratedEntry && hydratedEntry.cacheKey === cacheKey) {
    return {
      store: hydratedEntry.store,
      chunksForNavLocale: hydratedEntry.chunksForNavLocale,
    };
  }

  const chunksForNavLocale = filterChunksByNavigationLocale(
    embeddingsFile.chunks,
    navLocale
  );
  const store = await buildVectorStoreFromChunks(chunksForNavLocale);
  hydratedEntry = { cacheKey, store, chunksForNavLocale };
  return { store, chunksForNavLocale };
}

/** Test helper */
export function resetHydratedIndexCacheForTests(): void {
  hydratedEntry = null;
}
