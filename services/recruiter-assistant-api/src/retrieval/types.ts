import type { RecruiterNavLocale } from "../constants.js";
import type { EmbeddingChunk } from "../rag/retrieve.js";

export type RetrievalProviderKind = "custom" | "llamaindex";

export type RecruiterRetrieverProvider =
  | "custom"
  | "llamaindex-hydrated"
  | "llamaindex-native"
  | "compare";

export type RetrievedEvidenceChunk = {
  id: string;
  text: string;
  score: number | null;
  source: string;
  navLocale: RecruiterNavLocale;
  metadata: Record<string, string>;
  retrievalProvider: RetrievalProviderKind;
  embedding: number[];
};

export type RecruiterRetrieverInput = {
  query: string;
  navLocale: RecruiterNavLocale;
};

export type RecruiterRetrieverResult = {
  chunksForNavLocale: readonly EmbeddingChunk[];
  topChunks: readonly EmbeddingChunk[];
  sourceExcerpts: string;
  /** Cosine scores aligned to `topChunks` (descending), when the retriever computes them. */
  topScores?: readonly number[];
};

export interface RecruiterRetriever {
  retrieve(input: RecruiterRetrieverInput): Promise<RecruiterRetrieverResult>;
}

export type PortfolioCorpus = {
  allChunks: readonly EmbeddingChunk[];
  chunksForNavLocale: readonly EmbeddingChunk[];
};
