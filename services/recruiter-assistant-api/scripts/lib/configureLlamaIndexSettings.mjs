/**
 * LlamaIndex SimpleVectorStore requires Settings.embedModel even when nodes carry
 * precomputed embeddings. Shared by build-llamaindex-index.mjs and runtime TS loader.
 */
import { OpenAIEmbedding } from "@llamaindex/openai";
import { Settings } from "llamaindex";

const EMBEDDING_MODEL = "text-embedding-3-small";

export function ensureLlamaIndexSettings(apiKey = process.env.OPENAI_API_KEY) {
  Settings.embedModel = new OpenAIEmbedding({
    model: EMBEDDING_MODEL,
    apiKey: apiKey?.trim() || "build-placeholder-key",
  });
}
