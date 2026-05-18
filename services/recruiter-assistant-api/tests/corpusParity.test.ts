import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { vectorStoreDictToEmbeddingChunks } from "../src/retrieval/corpus/llamaindex/vectorStoreToEmbeddingChunks.js";
import { buildTestLlamaIndexEnvelope } from "./helpers/buildTestLlamaIndexEnvelope.js";
import { loadGoldenEmbeddingsFixture } from "./helpers/goldenLlamaIndexEnv.js";

function textHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function localeHistogram(
  chunks: readonly { metadata?: Record<string, string> }[]
) {
  const counts: Record<string, number> = {};
  for (const chunk of chunks) {
    const locale = chunk.metadata?.locale ?? "(missing)";
    counts[locale] = (counts[locale] ?? 0) + 1;
  }
  return counts;
}

describe("corpus parity (golden fixture vs LlamaIndex envelope)", () => {
  it("reconstructed llamaindex chunks match golden fixture", async () => {
    const file = loadGoldenEmbeddingsFixture();
    const envelope = await buildTestLlamaIndexEnvelope(file.chunks);
    const fromLlx = vectorStoreDictToEmbeddingChunks(envelope.vectorStore);

    expect(fromLlx).toHaveLength(file.chunks.length);
    expect(localeHistogram(fromLlx)).toEqual(localeHistogram(file.chunks));

    const byId = new Map(fromLlx.map((c) => [c.id, c]));
    for (const expected of file.chunks) {
      const actual = byId.get(expected.id)!;
      expect(textHash(actual.text)).toBe(textHash(expected.text));
      expect(actual.metadata).toEqual(expected.metadata ?? {});
      expect(actual.embedding.length).toBe(expected.embedding.length);
      expect(actual.embedding).toEqual(expected.embedding);
    }
  });
});
