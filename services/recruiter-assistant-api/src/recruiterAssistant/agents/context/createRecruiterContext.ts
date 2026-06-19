import { RAG_TOP_K } from "../../../constants.js";
import { loadInterestsPack } from "../../../interests/loadInterestsPack.js";
import { createRecruiterRetrieverWithFallback } from "../../../retrieval/createRecruiterRetriever.js";
import { logRetrievalSummary } from "../../../retrieval/logRetrievalSummary.js";
import { readRecruiterRetrieverProvider } from "../../../retrieval/retrieverProvider.js";
import { getActiveTrace } from "../../../tracing/requestTrace.js";
import type { RecruiterNavLocale } from "../../../constants.js";
import type { OpenAiProvider, RecruiterContext } from "../../types.js";

export async function createRecruiterContext(params: {
  openai: OpenAiProvider;
  navLocale: RecruiterNavLocale;
  userText: string;
}): Promise<RecruiterContext> {
  const interestsPack = await loadInterestsPack();
  const retrievalStarted = Date.now();
  const retrieval = await createRecruiterRetrieverWithFallback(
    params.openai
  ).retrieve({
    query: params.userText,
    navLocale: params.navLocale,
  });
  const retrievalLatencyMs = Date.now() - retrievalStarted;
  logRetrievalSummary({
    navLocale: params.navLocale,
    queryLength: params.userText.length,
    topK: RAG_TOP_K,
    topChunkIds: retrieval.topChunks.map((c) => c.id),
    latencyMs: retrievalLatencyMs,
  });
  const topScores = retrieval.topScores ?? [];
  getActiveTrace()?.recordRetrieval({
    provider: readRecruiterRetrieverProvider(),
    topK: RAG_TOP_K,
    returnedChunks: retrieval.topChunks.length,
    similarityMin: topScores.length > 0 ? Math.min(...topScores) : null,
    similarityMax: topScores.length > 0 ? Math.max(...topScores) : null,
    latencyMs: retrievalLatencyMs,
  });
  return {
    interestsPack,
    chunksForNavLocale: retrieval.chunksForNavLocale,
    topChunks: retrieval.topChunks,
    sourceExcerpts: retrieval.sourceExcerpts,
  };
}

/** Test hook: inject a custom retriever implementation. */
export async function createRecruiterContextWithRetriever(
  params: {
    openai: OpenAiProvider;
    navLocale: RecruiterNavLocale;
    userText: string;
  },
  retrieve: (input: {
    query: string;
    navLocale: RecruiterNavLocale;
  }) => Promise<
    Pick<
      RecruiterContext,
      "chunksForNavLocale" | "topChunks" | "sourceExcerpts"
    >
  >
): Promise<RecruiterContext> {
  const interestsPack = await loadInterestsPack();
  const retrieval = await retrieve({
    query: params.userText,
    navLocale: params.navLocale,
  });
  return { interestsPack, ...retrieval };
}
