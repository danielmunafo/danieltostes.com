import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { EmbeddingsFile } from "../src/rag/retrieve.js";
import { vectorStoreDictToEmbeddingChunks } from "../src/retrieval/corpus/llamaindex/vectorStoreToEmbeddingChunks.js";
import { buildTestLlamaIndexEnvelope } from "./helpers/buildTestLlamaIndexEnvelope.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const goldenPath = join(__dirname, "fixtures", "embeddings.golden.json");

describe("vectorStoreDictToEmbeddingChunks", () => {
  it("reconstructs golden chunks from a stamped vector store dict", async () => {
    const file = JSON.parse(readFileSync(goldenPath, "utf8")) as EmbeddingsFile;
    const envelope = await buildTestLlamaIndexEnvelope(file.chunks);
    const reconstructed = vectorStoreDictToEmbeddingChunks(
      envelope.vectorStore
    );

    expect(reconstructed).toHaveLength(file.chunks.length);
    const byId = new Map(reconstructed.map((c) => [c.id, c]));
    for (const expected of file.chunks) {
      const actual = byId.get(expected.id);
      expect(actual).toBeDefined();
      expect(actual!.text).toBe(expected.text);
      expect(actual!.embedding).toEqual(expected.embedding);
      expect(actual!.metadata).toEqual(expected.metadata ?? {});
    }
  });

  it("throws when metadata text is missing", () => {
    expect(() =>
      vectorStoreDictToEmbeddingChunks({
        embeddingDict: { x: [1, 2, 3] },
        metadataDict: {},
      })
    ).toThrow(/missing corpus text/i);
  });
});
