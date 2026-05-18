import { TextNode } from "llamaindex";
import type { EmbeddingChunk } from "../../rag/retrieve.js";

export function embeddingChunkToTextNode(chunk: EmbeddingChunk): TextNode {
  return new TextNode({
    id_: chunk.id,
    text: chunk.text,
    embedding: chunk.embedding,
    metadata: { ...(chunk.metadata ?? {}), chunkId: chunk.id },
  });
}

export function textNodeToChunkId(node: TextNode): string {
  const fromMeta = node.metadata?.chunkId;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    return fromMeta;
  }
  return node.id_;
}
