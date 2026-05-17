import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { EmbeddingChunk } from "../../src/rag/retrieve.js";
import {
  LLAMAINDEX_CORPUS_ENVELOPE_FORMAT,
  type LlamaIndexIndexPayload,
} from "../../src/retrieval/llamaindex/loadNativeIndex.js";
import { buildVectorStoreFromChunks } from "../../src/retrieval/llamaindex/buildVectorStoreFromChunks.js";
import { CORPUS_TEXT_METADATA_KEY } from "../../src/retrieval/corpus/llamaindex/vectorStoreToEmbeddingChunks.js";

export async function buildTestLlamaIndexEnvelope(
  chunks: readonly EmbeddingChunk[],
  version = "golden-test"
): Promise<LlamaIndexIndexPayload> {
  const store = await buildVectorStoreFromChunks(chunks);
  for (const chunk of chunks) {
    store.data.metadataDict[chunk.id] = {
      ...(chunk.metadata ?? {}),
      chunkId: chunk.id,
      [CORPUS_TEXT_METADATA_KEY]: chunk.text,
    };
  }
  return {
    format: LLAMAINDEX_CORPUS_ENVELOPE_FORMAT,
    model: "text-embedding-3-small",
    version,
    vectorStore: store.toDict(),
  };
}

/** Writes a temp index file and returns its path (for env-based integration tests). */
export async function writeTestLlamaIndexIndexFile(
  chunks: readonly EmbeddingChunk[]
): Promise<string> {
  const envelope = await buildTestLlamaIndexEnvelope(chunks);
  const dir = mkdtempSync(join(tmpdir(), "recruiter-llx-"));
  const path = join(dir, "llamaindex.golden.json");
  writeFileSync(path, JSON.stringify(envelope), "utf8");
  return path;
}
