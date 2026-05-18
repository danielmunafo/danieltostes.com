import { SimpleVectorStore } from "llamaindex";
import type { RecruiterNavLocale } from "../../constants.js";
import { loadPortfolioCorpus } from "../corpus/loadPortfolioCorpus.js";
import type { EmbeddingChunk } from "../../rag/retrieve.js";
import { buildVectorStoreFromChunks } from "./buildVectorStoreFromChunks.js";
import { getNativeIndexCacheKey } from "./loadNativeIndex.js";

type HydratedIndexEntry = {
  cacheKey: string;
  store: SimpleVectorStore;
  chunksForNavLocale: readonly EmbeddingChunk[];
};

let hydratedEntry: HydratedIndexEntry | null = null;

export async function getHydratedVectorStoreForLocale(
  navLocale: RecruiterNavLocale
): Promise<{
  store: SimpleVectorStore;
  chunksForNavLocale: readonly EmbeddingChunk[];
}> {
  const cacheKey = `${await getNativeIndexCacheKey()}|${navLocale}`;
  if (hydratedEntry && hydratedEntry.cacheKey === cacheKey) {
    return {
      store: hydratedEntry.store,
      chunksForNavLocale: hydratedEntry.chunksForNavLocale,
    };
  }

  const corpus = await loadPortfolioCorpus(navLocale);
  const chunksForNavLocale = corpus.chunksForNavLocale;
  const store = await buildVectorStoreFromChunks(chunksForNavLocale);
  hydratedEntry = { cacheKey, store, chunksForNavLocale };
  return { store, chunksForNavLocale };
}

/** Test helper */
export function resetHydratedIndexCacheForTests(): void {
  hydratedEntry = null;
}
