import { logInfo } from "../../logging/logger.js";
import { formatPortfolioChunks } from "../../rag/formatPortfolioChunks.js";
import { mergeRetrievalResults } from "../mergeRetrievalResults.js";
import { toEmbeddingChunks } from "../normalizeEvidence.js";
import { RAG_TOP_K } from "../../constants.js";
import type { OpenAiProvider } from "../../recruiterAssistant/types.js";
import type {
  RecruiterRetriever,
  RecruiterRetrieverInput,
  RecruiterRetrieverResult,
} from "../types.js";
import { createCustomRetrieverAdapter } from "./customRetrieverAdapter.js";
import { retrieveCustomEvidencePerQuery } from "./customRetrieverAdapter.js";
import {
  retrieveLlamaIndexEvidencePerQuery,
  type LlamaIndexRetrieverMode,
} from "./llamaindexRetrieverAdapter.js";
import { buildRetrievalQueries } from "../buildRetrievalQueries.js";
import { embedRetrievalQueries } from "../embedRetrievalQueries.js";

function jaccardOverlap(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const id of setA) {
    if (setB.has(id)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function scoreRange(scores: readonly (number | null)[]): {
  min: number | null;
  max: number | null;
} {
  const numeric = scores.filter((s): s is number => s != null);
  if (numeric.length === 0) return { min: null, max: null };
  return { min: Math.min(...numeric), max: Math.max(...numeric) };
}

export function createCompareRetrieverAdapter(
  openai: OpenAiProvider
): RecruiterRetriever {
  const customAdapter = createCustomRetrieverAdapter(openai);

  return {
    async retrieve(
      input: RecruiterRetrieverInput
    ): Promise<RecruiterRetrieverResult> {
      const compareMode = readCompareLlamaIndexMode();
      const started = Date.now();

      const queries = buildRetrievalQueries(input.query);
      const queryEmbeddings = await embedRetrievalQueries(openai, queries);

      const customStarted = Date.now();
      const custom = await customAdapter.retrieve(input);
      const customMs = Date.now() - customStarted;

      const llamaStarted = Date.now();
      let llamaIds: string[] = [];
      let llamaScores: (number | null)[] = [];
      let llamaCompareError: unknown;
      try {
        const { resultsPerQuery } = await retrieveLlamaIndexEvidencePerQuery(
          openai,
          input,
          compareMode
        );
        const merged = mergeRetrievalResults(resultsPerQuery, RAG_TOP_K);
        llamaIds = merged.map((c) => c.id);
        llamaScores = merged.map((c) => c.score);
      } catch (err) {
        llamaCompareError = err;
      }
      const llamaMs = Date.now() - llamaStarted;

      const customIds = custom.topChunks.map((c) => c.id);
      const onlyCustom = customIds.filter((id) => !llamaIds.includes(id));
      const onlyLlama = llamaIds.filter((id) => !customIds.includes(id));

      logInfo("retrieval.compare", "Retrieval provider comparison", {
        navLocale: input.navLocale,
        queryCount: queries.length,
        queryLength: input.query.length,
        topK: RAG_TOP_K,
        customTopIds: customIds,
        llamaindexTopIds: llamaIds,
        overlapJaccard: jaccardOverlap(customIds, llamaIds),
        onlyInCustom: onlyCustom,
        onlyInLlamaIndex: onlyLlama,
        customScoreRange: scoreRange([]),
        llamaindexScoreRange: scoreRange(llamaScores),
        customLatencyMs: customMs,
        llamaindexLatencyMs: llamaMs,
        totalLatencyMs: Date.now() - started,
        compareMode,
        userFacingProvider: "custom",
        ...(llamaCompareError ? { llamaCompareError } : {}),
      });

      return custom;
    },
  };
}

function readCompareLlamaIndexMode(): LlamaIndexRetrieverMode {
  const mode = process.env.RECRUITER_COMPARE_LLAMAINDEX_MODE?.trim();
  if (mode === "native") return "native";
  return "hydrated";
}
