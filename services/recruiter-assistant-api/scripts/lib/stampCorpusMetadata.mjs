/** Must match CORPUS_TEXT_METADATA_KEY in vectorStoreToEmbeddingChunks.ts */
export const CORPUS_TEXT_METADATA_KEY = "_corpusText";

/**
 * SimpleVectorStore only persists metadata when nodes have sourceNode; portfolio
 * TextNodes do not. Stamp text + business metadata so runtime can reconstruct EmbeddingChunk[].
 */
export function stampCorpusMetadataOnVectorStore(store, nodes) {
  for (const node of nodes) {
    const meta = { ...(node.metadata ?? {}), chunkId: node.id_ };
    const text =
      typeof node.getContent === "function"
        ? node.getContent()
        : typeof node.text === "string"
          ? node.text
          : "";
    store.data.metadataDict[node.id_] = {
      ...meta,
      [CORPUS_TEXT_METADATA_KEY]: text,
    };
  }
}
