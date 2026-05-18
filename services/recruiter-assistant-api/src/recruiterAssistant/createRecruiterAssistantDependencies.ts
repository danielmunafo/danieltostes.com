import { createOpenAI } from "@ai-sdk/openai";
import { getOpenAiApiKey } from "../secrets/openaiKey.js";
import { validateCorpusEnv } from "../retrieval/corpus/validateCorpusEnv.js";
import type { RecruiterAssistantDependencies } from "./types.js";

export async function createRecruiterAssistantDependencies(): Promise<RecruiterAssistantDependencies> {
  validateCorpusEnv();
  const apiKey = await getOpenAiApiKey();
  return {
    openai: createOpenAI({ apiKey }),
  };
}
