import { readRecruiterRetrieverProvider } from "../retrieverProvider.js";

function hasLlamaIndexIndexConfig(): boolean {
  return Boolean(
    process.env.LLAMAINDEX_INDEX_JSON_PATH?.trim() ||
    process.env.LLAMAINDEX_INDEX_S3_URI?.trim() ||
    (process.env.LLAMAINDEX_INDEX_S3_BUCKET?.trim() &&
      process.env.LLAMAINDEX_INDEX_S3_KEY?.trim())
  );
}

/** Validates RAG env before first corpus load or chat dependency creation. */
export function validateCorpusEnv(): void {
  if (!hasLlamaIndexIndexConfig()) {
    throw new Error(
      "LlamaIndex corpus not configured: set LLAMAINDEX_INDEX_JSON_PATH or LLAMAINDEX_INDEX_S3_URI (or LLAMAINDEX_INDEX_S3_BUCKET+LLAMAINDEX_INDEX_S3_KEY)"
    );
  }

  const retrieverProvider = readRecruiterRetrieverProvider();
  if (
    retrieverProvider === "llamaindex-native" ||
    retrieverProvider === "llamaindex-hydrated"
  ) {
    return;
  }

  if (retrieverProvider === "custom" || retrieverProvider === "compare") {
    return;
  }
}
