import type { EmbeddingChunk } from "../rag/retrieve.js";
import type {
  RecruiterNavLocale,
  RetrievedEvidenceChunk,
  RetrievalProviderKind,
} from "./types.js";

export function chunkSourceFromMetadata(
  metadata: Record<string, string> | undefined
): string {
  return metadata?.sectionId?.trim() || "portfolio";
}

export function toRetrievedEvidenceChunk(
  chunk: EmbeddingChunk,
  navLocale: RecruiterNavLocale,
  retrievalProvider: RetrievalProviderKind,
  score: number | null = null
): RetrievedEvidenceChunk {
  const metadata = { ...(chunk.metadata ?? {}) };
  return {
    id: chunk.id,
    text: chunk.text,
    score,
    source: chunkSourceFromMetadata(metadata),
    navLocale,
    metadata,
    retrievalProvider,
    embedding: chunk.embedding,
  };
}

export function toEmbeddingChunks(
  evidence: readonly RetrievedEvidenceChunk[]
): EmbeddingChunk[] {
  return evidence.map((item) => ({
    id: item.id,
    text: item.text,
    embedding: item.embedding,
    metadata: item.metadata,
  }));
}
