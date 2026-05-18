import { OpenAIEmbedding } from "@llamaindex/openai";
import { Settings } from "llamaindex";
import { EMBEDDING_MODEL } from "../../constants.js";

let configured = false;

/** LlamaIndex vector stores require a global embed model even when using precomputed vectors. */
export function ensureLlamaIndexSettings(): void {
  if (configured) return;
  Settings.embedModel = new OpenAIEmbedding({
    model: EMBEDDING_MODEL,
    apiKey: process.env.OPENAI_API_KEY?.trim() || "test-key",
  });
  configured = true;
}

/** Test helper */
export function resetLlamaIndexSettingsForTests(): void {
  configured = false;
}
