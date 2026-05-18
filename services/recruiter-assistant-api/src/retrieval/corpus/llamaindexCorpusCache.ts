import type { EmbeddingChunk } from "../../rag/retrieve.js";
import {
  getNativeIndexCacheKey,
  loadNativeIndexPayload,
} from "../llamaindex/loadNativeIndex.js";
import { vectorStoreDictToEmbeddingChunks } from "./llamaindex/vectorStoreToEmbeddingChunks.js";

let cachedAllChunks: readonly EmbeddingChunk[] | null = null;
let cachedKey = "";

export async function loadAllChunksFromLlamaIndexIndex(): Promise<
  readonly EmbeddingChunk[]
> {
  const cacheKey = await getNativeIndexCacheKey();
  if (cachedAllChunks && cachedKey === cacheKey) {
    return cachedAllChunks;
  }

  const payload = await loadNativeIndexPayload();
  const chunks = vectorStoreDictToEmbeddingChunks(payload.vectorStore);
  cachedAllChunks = chunks;
  cachedKey = cacheKey;
  return chunks;
}

/** Test helper */
export function resetLlamaIndexCorpusCacheForTests(): void {
  cachedAllChunks = null;
  cachedKey = "";
}
