import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { createOpenAI } from "@ai-sdk/openai";
import { resetLlamaIndexCorpusCacheForTests } from "../src/retrieval/corpus/llamaindexCorpusCache.js";
import { resetNativeIndexCacheForTests } from "../src/retrieval/llamaindex/loadNativeIndex.js";
import { resetHydratedIndexCacheForTests } from "../src/retrieval/llamaindex/hydratedIndexCache.js";
import { resetPortfolioCorpusValidationForTests } from "../src/retrieval/corpus/loadPortfolioCorpus.js";

const logInfo = vi.fn();
vi.mock("../src/logging/logger.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/logging/logger.js")>();
  return { ...actual, logInfo };
});

vi.mock("../src/retrieval/embedRetrievalQueries.js", () => ({
  embedRetrievalQueries: async (_openai: unknown, queries: readonly string[]) =>
    queries.map(() => [0.92, 0.08, 0.02, 0.01]),
}));

describe("compareRetrieverAdapter", () => {
  const prevProvider = process.env.RECRUITER_RETRIEVER_PROVIDER;

  beforeEach(() => {
    logInfo.mockClear();
    process.env.RECRUITER_RETRIEVER_PROVIDER = "compare";
    resetPortfolioCorpusValidationForTests();
    resetLlamaIndexCorpusCacheForTests();
    resetNativeIndexCacheForTests();
    resetHydratedIndexCacheForTests();
  });

  afterEach(() => {
    if (prevProvider === undefined)
      delete process.env.RECRUITER_RETRIEVER_PROVIDER;
    else process.env.RECRUITER_RETRIEVER_PROVIDER = prevProvider;
  });

  it("returns custom results and logs comparison fields", async () => {
    const { createRecruiterRetrieverForProvider } =
      await import("../src/retrieval/createRecruiterRetriever.js");
    const openai = createOpenAI({
      apiKey: "test-key",
      compatibility: "strict",
    });
    const retriever = createRecruiterRetrieverForProvider(openai, "compare");
    const result = await retriever.retrieve({
      query: "TypeScript staff engineer",
      navLocale: "en",
    });
    expect(result.topChunks.length).toBeGreaterThan(0);
    const compareLog = logInfo.mock.calls.find(
      (call) => call[0] === "retrieval.compare"
    );
    expect(compareLog).toBeDefined();
    const fields = compareLog?.[2] as Record<string, unknown>;
    expect(fields.navLocale).toBe("en");
    expect(
      fields.userFacingProvider === "custom" ||
        fields.customTopIds !== undefined
    ).toBe(true);
    expect(fields).toHaveProperty("overlapJaccard");
    expect(fields).toHaveProperty("customTopIds");
  });
});
