import { RAG_TOP_K } from "../../constants.js";
import { formatPortfolioChunks } from "../../rag/formatPortfolioChunks.js";
import { loadPortfolioCorpus } from "../corpus/loadPortfolioCorpus.js";
import { buildRetrievalQueries } from "../buildRetrievalQueries.js";
import { embedRetrievalQueries } from "../embedRetrievalQueries.js";
import { mergeRetrievalResults } from "../mergeRetrievalResults.js";
import { toEmbeddingChunks } from "../normalizeEvidence.js";
import { getHydratedVectorStoreForLocale } from "../llamaindex/hydratedIndexCache.js";
import { loadNativeVectorStore } from "../llamaindex/loadNativeIndex.js";
import { queryVectorStorePerEmbedding } from "../llamaindex/queryVectorStore.js";
import type { OpenAiProvider } from "../../recruiterAssistant/types.js";
import type {
  RecruiterRetriever,
  RecruiterRetrieverInput,
  RecruiterRetrieverResult,
} from "../types.js";

export type LlamaIndexRetrieverMode = "hydrated" | "native";

export function createLlamaIndexRetrieverAdapter(
  openai: OpenAiProvider,
  mode: LlamaIndexRetrieverMode
): RecruiterRetriever {
  return {
    async retrieve(
      input: RecruiterRetrieverInput
    ): Promise<RecruiterRetrieverResult> {
      const queries = buildRetrievalQueries(input.query);
      const queryEmbeddings = await embedRetrievalQueries(openai, queries);
      const perQueryK = Math.max(
        1,
        Math.ceil(RAG_TOP_K / queryEmbeddings.length)
      );

      let store;
      let chunksForNavLocale;

      if (mode === "hydrated") {
        const hydrated = await getHydratedVectorStoreForLocale(input.navLocale);
        store = hydrated.store;
        chunksForNavLocale = hydrated.chunksForNavLocale;
      } else {
        const corpus = await loadPortfolioCorpus(input.navLocale);
        chunksForNavLocale = corpus.chunksForNavLocale;
        store = await loadNativeVectorStore();
      }

      const resultsPerQuery = await queryVectorStorePerEmbedding(
        store,
        chunksForNavLocale,
        queryEmbeddings,
        perQueryK,
        input.navLocale
      );
      const merged = mergeRetrievalResults(resultsPerQuery, RAG_TOP_K);
      const topChunks = toEmbeddingChunks(merged);
      const topScores = merged
        .map((chunk) => chunk.score)
        .filter((score): score is number => typeof score === "number");

      return {
        chunksForNavLocale,
        topChunks,
        topScores,
        sourceExcerpts: formatPortfolioChunks(topChunks, input.navLocale),
      };
    },
  };
}

/** Exposes per-query hits for compare mode. */
export async function retrieveLlamaIndexEvidencePerQuery(
  openai: OpenAiProvider,
  input: RecruiterRetrieverInput,
  mode: LlamaIndexRetrieverMode
): Promise<{
  corpus: Awaited<ReturnType<typeof loadPortfolioCorpus>>;
  resultsPerQuery: import("../types.js").RetrievedEvidenceChunk[][];
}> {
  const corpus = await loadPortfolioCorpus(input.navLocale);
  const queries = buildRetrievalQueries(input.query);
  const queryEmbeddings = await embedRetrievalQueries(openai, queries);
  const perQueryK = Math.max(1, Math.ceil(RAG_TOP_K / queryEmbeddings.length));

  const store =
    mode === "hydrated"
      ? (await getHydratedVectorStoreForLocale(input.navLocale)).store
      : await loadNativeVectorStore();

  const chunksForNavLocale =
    mode === "hydrated"
      ? (await getHydratedVectorStoreForLocale(input.navLocale))
          .chunksForNavLocale
      : corpus.chunksForNavLocale;

  const resultsPerQuery = await queryVectorStorePerEmbedding(
    store,
    chunksForNavLocale,
    queryEmbeddings,
    perQueryK,
    input.navLocale
  );
  return { corpus, resultsPerQuery };
}
