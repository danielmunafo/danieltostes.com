import type { RecruiterRetrieverProvider } from "./types.js";

const VALID_PROVIDERS: readonly RecruiterRetrieverProvider[] = [
  "custom",
  "llamaindex-hydrated",
  "llamaindex-native",
  "compare",
] as const;

export function parseRecruiterRetrieverProvider(
  value: string | undefined
): RecruiterRetrieverProvider {
  const trimmed = value?.trim();
  if (trimmed && (VALID_PROVIDERS as readonly string[]).includes(trimmed)) {
    return trimmed as RecruiterRetrieverProvider;
  }
  return "custom";
}

export function readRecruiterRetrieverProvider(): RecruiterRetrieverProvider {
  return parseRecruiterRetrieverProvider(
    process.env.RECRUITER_RETRIEVER_PROVIDER
  );
}

export function readRecruiterRetrieverFallback(): RecruiterRetrieverProvider | null {
  const fallback = process.env.RECRUITER_RETRIEVER_FALLBACK?.trim();
  if (fallback === "custom") return "custom";
  return null;
}
