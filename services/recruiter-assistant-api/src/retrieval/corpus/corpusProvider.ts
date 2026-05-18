/** Canonical portfolio corpus is always reconstructed from the LlamaIndex index artifact. */
export type RecruiterCorpusProvider = "llamaindex";

export function parseRecruiterCorpusProvider(
  value: string | undefined
): RecruiterCorpusProvider {
  const trimmed = value?.trim();
  if (trimmed && trimmed !== "llamaindex") {
    throw new Error(
      `Unsupported RECRUITER_CORPUS_PROVIDER="${trimmed}". Only llamaindex is supported.`
    );
  }
  return "llamaindex";
}

export function readRecruiterCorpusProvider(): RecruiterCorpusProvider {
  return parseRecruiterCorpusProvider(process.env.RECRUITER_CORPUS_PROVIDER);
}
