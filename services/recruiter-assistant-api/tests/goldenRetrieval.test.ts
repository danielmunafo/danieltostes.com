import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { createOpenAI } from "@ai-sdk/openai";
import {
  cosineSimilarity,
  filterChunksByNavigationLocale,
  retrieveMergedTopK,
} from "../src/rag/retrieve.js";
import { buildRetrievalQueries } from "../src/retrieval/buildRetrievalQueries.js";
import { RAG_TOP_K } from "../src/constants.js";
import { resetPortfolioCorpusValidationForTests } from "../src/retrieval/corpus/loadPortfolioCorpus.js";
import { resetLlamaIndexCorpusCacheForTests } from "../src/retrieval/corpus/llamaindexCorpusCache.js";
import { mergeRetrievalResults } from "../src/retrieval/mergeRetrievalResults.js";
import { toRetrievedEvidenceChunk } from "../src/retrieval/normalizeEvidence.js";
import { resetNativeIndexCacheForTests } from "../src/retrieval/llamaindex/loadNativeIndex.js";
import { resetHydratedIndexCacheForTests } from "../src/retrieval/llamaindex/hydratedIndexCache.js";
import { loadGoldenEmbeddingsFixture } from "./helpers/goldenLlamaIndexEnv.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

vi.mock("../src/retrieval/embedRetrievalQueries.js", () => ({
  embedRetrievalQueries: async (_openai: unknown, queries: readonly string[]) =>
    queries.map(() => [0.92, 0.08, 0.02, 0.01]),
}));

describe("goldenRetrieval", () => {
  it("staff full-stack JD surfaces TypeScript experience", () => {
    const jd = readFileSync(
      join(__dirname, "fixtures", "staff-fullstack-jd.txt"),
      "utf8"
    );
    const file = loadGoldenEmbeddingsFixture();
    const chunks = filterChunksByNavigationLocale(file.chunks, "en");
    const top = retrieveMergedTopK(chunks, [[0.92, 0.08, 0.02, 0.01]], 3);
    expect(top[0]?.id).toBe("en-section-experience-item-0-s0-p0");
  });

  it("communication-heavy JD surfaces professional context", () => {
    const jd =
      "Must have fluent English and excellent stakeholder communication. Remote EU work authorization.";
    const file = loadGoldenEmbeddingsFixture();
    const chunks = filterChunksByNavigationLocale(file.chunks, "en");
    const queries = buildRetrievalQueries(jd);
    const queryEmbeddings = queries.map(() => [0.05, 0.88, 0.1, 0.08]);
    const top = retrieveMergedTopK(chunks, queryEmbeddings, RAG_TOP_K);
    const ids = top.map((c) => c.id);
    expect(ids).toContain("en-section-professional-context-item-0-s0-p0");
  });

  it("AI RAG JD surfaces impact chunk", () => {
    const file = loadGoldenEmbeddingsFixture();
    const chunks = filterChunksByNavigationLocale(file.chunks, "en");
    const top = retrieveMergedTopK(chunks, [[0.1, 0.12, 0.9, 0.05]], RAG_TOP_K);
    expect(top[0]?.metadata?.sectionId).toBe("impact");
  });

  it("mergeRetrievalResults matches retrieveMergedTopK ordering for golden corpus", () => {
    const file = loadGoldenEmbeddingsFixture();
    const chunks = filterChunksByNavigationLocale(file.chunks, "en");
    const q1 = [0.92, 0.08, 0.02, 0.01];
    const q2 = [0.1, 0.12, 0.9, 0.05];
    const fromRetrieve = retrieveMergedTopK(chunks, [q1, q2], 3).map(
      (c) => c.id
    );
    const perQuery = [
      chunks
        .map((c) => ({
          chunk: c,
          score: cosineSimilarity(c.embedding, q1),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(({ chunk, score }) =>
          toRetrievedEvidenceChunk(chunk, "en", "custom", score)
        ),
      chunks
        .map((c) => ({
          chunk: c,
          score: cosineSimilarity(c.embedding, q2),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 2)
        .map(({ chunk, score }) =>
          toRetrievedEvidenceChunk(chunk, "en", "custom", score)
        ),
    ];
    const merged = mergeRetrievalResults(perQuery, 3).map((c) => c.id);
    expect(merged).toEqual(fromRetrieve);
  });
});

describe("createRecruiterRetrieverForProvider", () => {
  beforeEach(() => {
    resetPortfolioCorpusValidationForTests();
    resetLlamaIndexCorpusCacheForTests();
    resetNativeIndexCacheForTests();
    resetHydratedIndexCacheForTests();
  });

  it("custom adapter returns excerpts from golden corpus", async () => {
    const { createRecruiterRetrieverForProvider } =
      await import("../src/retrieval/createRecruiterRetriever.js");
    const openai = createOpenAI({
      apiKey: "test-key",
      compatibility: "strict",
    });
    const retriever = createRecruiterRetrieverForProvider(openai, "custom");
    const result = await retriever.retrieve({
      query: "TypeScript React Node staff engineer",
      navLocale: "en",
    });
    expect(result.topChunks.length).toBeGreaterThan(0);
    expect(result.sourceExcerpts).toContain("###");
    expect(result.chunksForNavLocale.length).toBe(5);
  });

  it("llamaindex-native uses only the LlamaIndex index artifact", async () => {
    const { createRecruiterRetrieverForProvider } =
      await import("../src/retrieval/createRecruiterRetriever.js");
    const openai = createOpenAI({
      apiKey: "test-key",
      compatibility: "strict",
    });
    const retriever = createRecruiterRetrieverForProvider(
      openai,
      "llamaindex-native"
    );
    const result = await retriever.retrieve({
      query: "TypeScript React Node staff engineer",
      navLocale: "en",
    });
    expect(result.topChunks.length).toBeGreaterThan(0);
    expect(result.chunksForNavLocale.length).toBe(5);
  });
});
