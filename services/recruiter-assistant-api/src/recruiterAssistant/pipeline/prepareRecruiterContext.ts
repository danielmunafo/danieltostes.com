import { embedMany } from "ai";
import { EMBEDDING_MODEL, RAG_TOP_K } from "../../constants.js";
import { loadEmbeddingsFile } from "../../embeddings/loadEmbeddings.js";
import { loadInterestsPack } from "../../interests/loadInterestsPack.js";
import { buildJdHardGateRetrievalQueries } from "../../rag/hardGates/buildJdHardGateRetrievalQueries.js";
import { formatPortfolioChunks } from "../../rag/prompt.js";
import {
  filterChunksByNavigationLocale,
  retrieveMergedTopK,
} from "../../rag/retrieve.js";
import type { RecruiterNavLocale } from "../../constants.js";
import type { OpenAiProvider, RecruiterContext } from "../types.js";

export async function prepareRecruiterContext(params: {
  openai: OpenAiProvider;
  navLocale: RecruiterNavLocale;
  userText: string;
}): Promise<RecruiterContext> {
  const embeddingsFile = await loadEmbeddingsFile();
  const interestsPack = await loadInterestsPack();
  const chunksForNavLocale = filterChunksByNavigationLocale(
    embeddingsFile.chunks,
    params.navLocale
  );
  const retrievalQueries = [
    params.userText,
    ...buildJdHardGateRetrievalQueries(params.userText),
  ];
  const { embeddings: queryEmbeddings } = await embedMany({
    model: params.openai.embedding(EMBEDDING_MODEL),
    values: retrievalQueries,
  });
  const topChunks = retrieveMergedTopK(
    chunksForNavLocale,
    queryEmbeddings,
    RAG_TOP_K
  );
  return {
    interestsPack,
    chunksForNavLocale,
    topChunks,
    sourceExcerpts: formatPortfolioChunks(topChunks, params.navLocale),
  };
}
