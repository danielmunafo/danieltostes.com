import { createOpenAI, type OpenAIProviderSettings } from "@ai-sdk/openai";
import { getOpenAiApiKey } from "../secrets/openaiKey.js";
import { validateCorpusEnv } from "../retrieval/corpus/validateCorpusEnv.js";
import type {
  OpenAiProvider,
  RecruiterAssistantDependencies,
} from "./types.js";

const OPENAI_COMPATIBILITY_MODE = "strict";

type RecruiterOpenAIProviderOptions = Pick<OpenAIProviderSettings, "fetch">;

export function createRecruiterOpenAIProvider(
  apiKey: string,
  options: RecruiterOpenAIProviderOptions = {}
): OpenAiProvider {
  return createOpenAI({
    apiKey,
    compatibility: OPENAI_COMPATIBILITY_MODE,
    ...options,
  });
}

export async function createRecruiterAssistantDependencies(): Promise<RecruiterAssistantDependencies> {
  validateCorpusEnv();
  const apiKey = await getOpenAiApiKey();
  return {
    openai: createRecruiterOpenAIProvider(apiKey),
  };
}
