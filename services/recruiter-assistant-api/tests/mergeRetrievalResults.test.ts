import { describe, expect, it } from "vitest";
import { mergeRetrievalResults } from "../src/retrieval/mergeRetrievalResults.js";
import type { RetrievedEvidenceChunk } from "../src/retrieval/types.js";

const mk = (
  id: string,
  score: number,
  sectionId: string
): RetrievedEvidenceChunk => ({
  id,
  text: id,
  score,
  source: sectionId,
  navLocale: "en",
  metadata: { locale: "en", sectionId },
  retrievalProvider: "custom",
  embedding: [score, 0, 0, 0],
});

describe("mergeRetrievalResults", () => {
  it("dedupes by id keeping best score across queries", () => {
    const merged = mergeRetrievalResults(
      [
        [mk("a", 0.9, "experience"), mk("b", 0.5, "education")],
        [mk("a", 0.7, "experience"), mk("c", 0.8, "impact")],
      ],
      3
    );
    expect(merged.map((h) => h.id)).toEqual(["a", "c", "b"]);
    expect(merged[0].score).toBe(0.9);
  });

  it("returns empty for no query results", () => {
    expect(mergeRetrievalResults([], 30)).toEqual([]);
  });
});
