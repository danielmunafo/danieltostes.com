import { embedMany } from "ai";
import { EMBEDDING_MODEL } from "../constants.js";
import type { OpenAiProvider } from "../recruiterAssistant/types.js";
import { traceGenerate } from "../tracing/requestTrace.js";

export async function embedRetrievalQueries(
  openai: OpenAiProvider,
  queries: readonly string[]
): Promise<number[][]> {
  if (queries.length === 0) return [];
  const { embeddings } = await traceGenerate(
    "retrieval_embed",
    EMBEDDING_MODEL,
    "embedding",
    () =>
      embedMany({
        model: openai.embedding(EMBEDDING_MODEL),
        values: [...queries],
      })
  );
  return embeddings;
}
