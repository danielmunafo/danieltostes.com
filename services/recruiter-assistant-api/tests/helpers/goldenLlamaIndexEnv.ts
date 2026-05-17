import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EmbeddingsFile } from "../../src/rag/retrieve.js";
import { writeTestLlamaIndexIndexFile } from "./buildTestLlamaIndexEnvelope.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const goldenEmbeddingsFixturePath = join(
  __dirname,
  "..",
  "fixtures",
  "embeddings.golden.json"
);

let goldenIndexPath: string | null = null;

export function loadGoldenEmbeddingsFixture(): EmbeddingsFile {
  return JSON.parse(
    readFileSync(goldenEmbeddingsFixturePath, "utf8")
  ) as EmbeddingsFile;
}

/** Writes a stamped LlamaIndex index from the golden fixture (cached per process). */
export async function ensureGoldenLlamaIndexEnv(): Promise<string> {
  if (process.env.LLAMAINDEX_INDEX_JSON_PATH?.trim()) {
    return process.env.LLAMAINDEX_INDEX_JSON_PATH;
  }
  if (!goldenIndexPath) {
    const file = loadGoldenEmbeddingsFixture();
    goldenIndexPath = await writeTestLlamaIndexIndexFile(file.chunks);
  }
  process.env.LLAMAINDEX_INDEX_JSON_PATH = goldenIndexPath;
  return goldenIndexPath;
}
