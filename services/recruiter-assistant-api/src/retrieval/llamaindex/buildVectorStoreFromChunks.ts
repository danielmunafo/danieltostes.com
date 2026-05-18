import { SimpleVectorStore } from "llamaindex";
import type { EmbeddingChunk } from "../../rag/retrieve.js";
import { ensureLlamaIndexSettings } from "./configureLlamaIndexSettings.js";
import { embeddingChunkToTextNode } from "./chunksToTextNodes.js";

export async function buildVectorStoreFromChunks(
  chunks: readonly EmbeddingChunk[]
): Promise<SimpleVectorStore> {
  ensureLlamaIndexSettings();
  const store = new SimpleVectorStore();
  const nodes = chunks.map((chunk) => embeddingChunkToTextNode(chunk));
  if (nodes.length > 0) {
    await store.add(nodes);
  }
  return store;
}
