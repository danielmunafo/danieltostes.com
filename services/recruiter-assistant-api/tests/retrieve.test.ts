import { describe, expect, it } from "vitest";
import {
  filterChunksByNavigationLocale,
  retrieveTopK,
  type EmbeddingChunk,
} from "../src/rag/retrieve.js";

describe("filterChunksByNavigationLocale", () => {
  const mk = (id: string, locale: string): EmbeddingChunk => ({
    id,
    text: id,
    embedding: [1, 0, 0],
    metadata: { locale },
  });

  it("returns only chunks whose metadata.locale matches", () => {
    const chunks = [mk("a", "en"), mk("b", "es"), mk("c", "es")];
    const es = filterChunksByNavigationLocale(chunks, "es");
    expect(es.map((c) => c.id)).toEqual(["b", "c"]);
  });

  it("falls back to the full corpus when no chunk declares the locale", () => {
    const chunks = [mk("a", "en"), mk("b", "en")];
    const itChunks = filterChunksByNavigationLocale(chunks, "it");
    expect(itChunks).toEqual(chunks);
  });
});

describe("retrieveTopK", () => {
  const chunks: EmbeddingChunk[] = [
    { id: "a", text: "TypeScript React", embedding: [1, 0, 0] },
    { id: "b", text: "Ruby on Rails", embedding: [0, 1, 0] },
    { id: "c", text: "Python ML", embedding: [0, 0, 1] },
  ];

  it("ranks closest vector first", () => {
    const q = [0.9, 0.1, 0];
    const top = retrieveTopK(chunks, q, 2);
    expect(top.map((c) => c.id)).toEqual(["a", "b"]);
  });
});
