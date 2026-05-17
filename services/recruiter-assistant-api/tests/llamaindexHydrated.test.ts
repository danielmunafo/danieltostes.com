import { describe, expect, it, beforeEach, vi } from "vitest";
import { createOpenAI } from "@ai-sdk/openai";
import { resetHydratedIndexCacheForTests } from "../src/retrieval/llamaindex/hydratedIndexCache.js";
import { resetLlamaIndexCorpusCacheForTests } from "../src/retrieval/corpus/llamaindexCorpusCache.js";
import { resetNativeIndexCacheForTests } from "../src/retrieval/llamaindex/loadNativeIndex.js";
import { resetPortfolioCorpusValidationForTests } from "../src/retrieval/corpus/loadPortfolioCorpus.js";
import { VectorStoreQueryMode } from "llamaindex";
import { buildVectorStoreFromChunks } from "../src/retrieval/llamaindex/buildVectorStoreFromChunks.js";
import { filterChunksByNavigationLocale } from "../src/rag/retrieve.js";
import { loadGoldenEmbeddingsFixture } from "./helpers/goldenLlamaIndexEnv.js";

vi.mock("../src/retrieval/embedRetrievalQueries.js", () => ({
  embedRetrievalQueries: async (_openai: unknown, queries: readonly string[]) =>
    queries.map(() => [0.92, 0.08, 0.02, 0.01]),
}));

describe("llamaindex hydrated retrieval", () => {
  beforeEach(() => {
    resetPortfolioCorpusValidationForTests();
    resetLlamaIndexCorpusCacheForTests();
    resetNativeIndexCacheForTests();
    resetHydratedIndexCacheForTests();
  });

  it("builds vector store from chunks with precomputed embeddings", async () => {
    const file = loadGoldenEmbeddingsFixture();
    const chunks = filterChunksByNavigationLocale(file.chunks, "en");
    const store = await buildVectorStoreFromChunks(chunks);
    const result = await store.query({
      queryEmbedding: [0.92, 0.08, 0.02, 0.01],
      similarityTopK: 2,
      mode: VectorStoreQueryMode.DEFAULT,
    });
    expect(result.ids.length).toBeGreaterThan(0);
  });

  it("hydrated adapter returns top chunks", async () => {
    const { createRecruiterRetrieverForProvider } =
      await import("../src/retrieval/createRecruiterRetriever.js");
    const openai = createOpenAI({
      apiKey: "test-key",
      compatibility: "strict",
    });
    const retriever = createRecruiterRetrieverForProvider(
      openai,
      "llamaindex-hydrated"
    );
    const result = await retriever.retrieve({
      query: "TypeScript backend",
      navLocale: "en",
    });
    expect(result.topChunks.length).toBeGreaterThan(0);
    expect(result.topChunks[0]?.embedding.length).toBeGreaterThan(0);
  });
});
