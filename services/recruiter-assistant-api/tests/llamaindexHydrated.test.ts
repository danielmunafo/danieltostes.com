import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createOpenAI } from "@ai-sdk/openai";
import { resetEmbeddingsCacheForTests } from "../src/embeddings/loadEmbeddings.js";
import { resetHydratedIndexCacheForTests } from "../src/retrieval/llamaindex/hydratedIndexCache.js";
import { VectorStoreQueryMode } from "llamaindex";
import { buildVectorStoreFromChunks } from "../src/retrieval/llamaindex/buildVectorStoreFromChunks.js";
import { filterChunksByNavigationLocale } from "../src/rag/retrieve.js";
import type { EmbeddingsFile } from "../src/rag/retrieve.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const goldenPath = join(__dirname, "fixtures", "embeddings.golden.json");

vi.mock("../src/retrieval/embedRetrievalQueries.js", () => ({
  embedRetrievalQueries: async (_openai: unknown, queries: readonly string[]) =>
    queries.map(() => [0.92, 0.08, 0.02, 0.01]),
}));

describe("llamaindex hydrated retrieval", () => {
  const prevEmb = process.env.EMBEDDINGS_JSON_PATH;

  beforeEach(() => {
    process.env.EMBEDDINGS_JSON_PATH = goldenPath;
    resetEmbeddingsCacheForTests();
    resetHydratedIndexCacheForTests();
  });

  afterEach(() => {
    resetEmbeddingsCacheForTests();
    resetHydratedIndexCacheForTests();
    if (prevEmb === undefined) delete process.env.EMBEDDINGS_JSON_PATH;
    else process.env.EMBEDDINGS_JSON_PATH = prevEmb;
  });

  it("builds vector store from chunks with precomputed embeddings", async () => {
    const file = JSON.parse(readFileSync(goldenPath, "utf8")) as EmbeddingsFile;
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
