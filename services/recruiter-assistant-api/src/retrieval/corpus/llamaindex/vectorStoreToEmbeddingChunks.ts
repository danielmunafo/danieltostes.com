import type { EmbeddingChunk } from "../../../rag/retrieve.js";

/** Persisted on each node in metadataDict by build-llamaindex-index.mjs. */
export const CORPUS_TEXT_METADATA_KEY = "_corpusText";

const BUSINESS_METADATA_KEYS = [
  "locale",
  "sectionId",
  "scrollTargetId",
  "title",
  "category",
] as const;

type SimpleVectorStoreDict = {
  embeddingDict?: Record<string, number[]>;
  metadataDict?: Record<string, Record<string, unknown>>;
};

function chunkIdFromMetadata(
  nodeId: string,
  meta: Record<string, unknown>
): string {
  const fromMeta = meta.chunkId;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta.trim();
  }
  return nodeId;
}

function businessMetadata(
  meta: Record<string, unknown>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of BUSINESS_METADATA_KEYS) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

/**
 * Reconstructs portfolio chunks from a persisted SimpleVectorStore dict.
 * Requires metadataDict entries written at index build time.
 */
export function vectorStoreDictToEmbeddingChunks(
  dict: SimpleVectorStoreDict
): EmbeddingChunk[] {
  const embeddingDict = dict.embeddingDict ?? {};
  const metadataDict = dict.metadataDict ?? {};
  const ids = Object.keys(embeddingDict);
  if (ids.length === 0) {
    throw new Error("LlamaIndex vector store has no embedding entries");
  }

  const chunks: EmbeddingChunk[] = [];
  const missingText: string[] = [];

  for (const nodeId of ids) {
    const embedding = embeddingDict[nodeId];
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error(`LlamaIndex node "${nodeId}" has no embedding vector`);
    }

    const meta = metadataDict[nodeId];
    if (!meta || typeof meta !== "object") {
      missingText.push(nodeId);
      continue;
    }

    const text = meta[CORPUS_TEXT_METADATA_KEY];
    if (typeof text !== "string" || !text.trim()) {
      missingText.push(nodeId);
      continue;
    }

    const id = chunkIdFromMetadata(nodeId, meta);
    chunks.push({
      id,
      text: text.trim(),
      embedding,
      metadata: businessMetadata(meta),
    });
  }

  if (missingText.length > 0) {
    const sample = missingText.slice(0, 3).join(", ");
    throw new Error(
      `LlamaIndex index missing corpus text/metadata for ${missingText.length} node(s) (e.g. ${sample}). Rebuild with an updated build-llamaindex-index.mjs.`
    );
  }

  return chunks;
}
