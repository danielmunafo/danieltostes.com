import { logInfo } from "../logging/logger.js";
import { readRecruiterRetrieverProvider } from "./retrieverProvider.js";

export function logRetrievalSummary(params: {
  navLocale: string;
  queryLength: number;
  topK: number;
  topChunkIds: readonly string[];
  latencyMs: number;
}): void {
  logInfo("retrieval", "Portfolio context retrieved", {
    provider: readRecruiterRetrieverProvider(),
    navLocale: params.navLocale,
    queryLength: params.queryLength,
    topK: params.topK,
    retrievedCount: params.topChunkIds.length,
    topSources: params.topChunkIds.slice(0, 8),
    latencyMs: params.latencyMs,
  });
}
