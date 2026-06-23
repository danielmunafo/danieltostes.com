import { embedMany } from "ai";
import { EMBEDDING_MODEL } from "../constants.js";
import { runModelStage } from "../reliability/withReliability.js";
import type { OpenAiProvider } from "../recruiterAssistant/types.js";

export async function embedRetrievalQueries(
  openai: OpenAiProvider,
  queries: readonly string[]
): Promise<number[][]> {
  if (queries.length === 0) return [];
  const { embeddings } = await runModelStage(
    "retrieval_embed",
    "embedding",
    EMBEDDING_MODEL,
    ({ abortSignal, maxRetries }) =>
      embedMany({
        model: openai.embedding(EMBEDDING_MODEL),
        values: [...queries],
        abortSignal,
        maxRetries,
      })
  );
  return embeddings;
}
