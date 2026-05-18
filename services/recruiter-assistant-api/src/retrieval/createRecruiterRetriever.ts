import type { OpenAiProvider } from "../recruiterAssistant/types.js";
import { createCompareRetrieverAdapter } from "./adapters/compareRetrieverAdapter.js";
import { createCustomRetrieverAdapter } from "./adapters/customRetrieverAdapter.js";
import { createLlamaIndexRetrieverAdapter } from "./adapters/llamaindexRetrieverAdapter.js";
import {
  readRecruiterRetrieverFallback,
  readRecruiterRetrieverProvider,
} from "./retrieverProvider.js";
import type {
  RecruiterRetriever,
  RecruiterRetrieverProvider,
} from "./types.js";
export function createRecruiterRetriever(
  openai: OpenAiProvider
): RecruiterRetriever {
  const provider = readRecruiterRetrieverProvider();
  return createRecruiterRetrieverForProvider(openai, provider);
}

export function createRecruiterRetrieverForProvider(
  openai: OpenAiProvider,
  provider: RecruiterRetrieverProvider
): RecruiterRetriever {
  switch (provider) {
    case "custom":
      return createCustomRetrieverAdapter(openai);
    case "llamaindex-hydrated":
      return createLlamaIndexRetrieverAdapter(openai, "hydrated");
    case "llamaindex-native":
      return createLlamaIndexRetrieverAdapter(openai, "native");
    case "compare":
      return createCompareRetrieverAdapter(openai);
    default:
      return createCustomRetrieverAdapter(openai);
  }
}

/** Wraps retrieve with optional fallback when LlamaIndex load/query fails. */
export function createRecruiterRetrieverWithFallback(
  openai: OpenAiProvider
): RecruiterRetriever {
  const provider = readRecruiterRetrieverProvider();
  const fallback = readRecruiterRetrieverFallback();
  const inner = createRecruiterRetrieverForProvider(openai, provider);
  if (fallback !== "custom" || provider === "custom") {
    return inner;
  }
  const custom = createCustomRetrieverAdapter(openai);
  return {
    async retrieve(input) {
      try {
        return await inner.retrieve(input);
      } catch {
        return custom.retrieve(input);
      }
    },
  };
}
