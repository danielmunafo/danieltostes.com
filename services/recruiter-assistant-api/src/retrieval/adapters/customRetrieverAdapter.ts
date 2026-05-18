import { RAG_TOP_K } from "../../constants.js";
import { formatPortfolioChunks } from "../../rag/formatPortfolioChunks.js";
import {
  cosineSimilarity,
  retrieveMergedTopK,
  type EmbeddingChunk,
} from "../../rag/retrieve.js";
import type { OpenAiProvider } from "../../recruiterAssistant/types.js";
import { buildRetrievalQueries } from "../buildRetrievalQueries.js";
import { loadPortfolioCorpus } from "../corpus/loadPortfolioCorpus.js";
import { embedRetrievalQueries } from "../embedRetrievalQueries.js";
import { toRetrievedEvidenceChunk } from "../normalizeEvidence.js";
import type {
  RecruiterRetriever,
  RecruiterRetrieverInput,
  RecruiterRetrieverResult,
  RetrievedEvidenceChunk,
} from "../types.js";

export function createCustomRetrieverAdapter(
  openai: OpenAiProvider
): RecruiterRetriever {
  return {
    async retrieve(
      input: RecruiterRetrieverInput
    ): Promise<RecruiterRetrieverResult> {
      const corpus = await loadPortfolioCorpus(input.navLocale);
      const queries = buildRetrievalQueries(input.query);
      const queryEmbeddings = await embedRetrievalQueries(openai, queries);
      const topChunks = retrieveMergedTopK(
        corpus.chunksForNavLocale,
        queryEmbeddings,
        RAG_TOP_K
      );
      return {
        chunksForNavLocale: corpus.chunksForNavLocale,
        topChunks,
        sourceExcerpts: formatPortfolioChunks(topChunks, input.navLocale),
      };
    },
  };
}

/** Per-query scored hits for compare mode (custom path). */
export async function retrieveCustomEvidencePerQuery(
  openai: OpenAiProvider,
  input: RecruiterRetrieverInput
): Promise<{
  corpus: Awaited<ReturnType<typeof loadPortfolioCorpus>>;
  resultsPerQuery: RetrievedEvidenceChunk[][];
}> {
  const corpus = await loadPortfolioCorpus(input.navLocale);
  const queries = buildRetrievalQueries(input.query);
  const queryEmbeddings = await embedRetrievalQueries(openai, queries);
  const perQueryK = Math.max(1, Math.ceil(RAG_TOP_K / queryEmbeddings.length));
  const resultsPerQuery = queryEmbeddings.map((queryEmbedding) =>
    scoreChunksForQuery(
      corpus.chunksForNavLocale,
      queryEmbedding,
      perQueryK,
      input.navLocale
    )
  );
  return { corpus, resultsPerQuery };
}

function scoreChunksForQuery(
  chunks: readonly EmbeddingChunk[],
  queryEmbedding: number[],
  perQueryK: number,
  navLocale: RecruiterRetrieverInput["navLocale"]
): RetrievedEvidenceChunk[] {
  return chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(chunk.embedding, queryEmbedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, perQueryK)
    .map(({ chunk, score }) =>
      toRetrievedEvidenceChunk(chunk, navLocale, "custom", score)
    );
}
