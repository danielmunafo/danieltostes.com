import { describe, expect, it } from "vitest";
import {
  filterChunksForReferenceMatching,
  findBestMatch,
  referenceSupportLevelKey,
  renderReferencesMarkdown,
  buildClaimExtractionPromptForTest,
  formatExcerptForTest,
  splitSentencesForTest,
  type ReferenceItem,
} from "../src/rag/references.js";
import type { EmbeddingChunk } from "../src/rag/retrieve.js";

const klarnaChunk: EmbeddingChunk = {
  id: "klarna",
  text: "Fintech engineering at Klarna across high-traffic consumer flows.",
  embedding: [1, 0, 0],
  metadata: {
    locale: "en",
    sectionId: "experience",
    title: "Klarna",
    category: "experience",
    scrollTargetId: "section-experience-item-0",
  },
};

const sagaChunk: EmbeddingChunk = {
  id: "saga",
  text: "Distributed Systems — Event-Driven Coordination and Failure Isolation. SAGA patterns with deterministic state machines for multi-step workflows.",
  embedding: [0, 1, 0],
  metadata: {
    locale: "en",
    sectionId: "ragEvidence",
    title: "Distributed Systems",
    category: "distributed-systems",
    scrollTargetId: "section-rag-evidence-en",
  },
};

const titlelessChunk: EmbeddingChunk = {
  id: "raw",
  text: "Plain content with no metadata.",
  embedding: [0, 0, 1],
};

describe("findBestMatch", () => {
  it("returns the chunk with the highest cosine similarity", () => {
    const result = findBestMatch(
      [klarnaChunk, sagaChunk, titlelessChunk],
      [0.9, 0.1, 0]
    );
    expect(result.chunk?.id).toBe("klarna");
    expect(result.score).toBeGreaterThan(0.9);
  });

  it("returns null chunk and 0 score for empty corpus", () => {
    const result = findBestMatch([], [1, 0, 0]);
    expect(result.chunk).toBeNull();
    expect(result.score).toBe(0);
  });
});

describe("referenceSupportLevelKey", () => {
  it("maps cosine scores to support buckets", () => {
    expect(referenceSupportLevelKey(0.72)).toBe("strong");
    expect(referenceSupportLevelKey(0.55)).toBe("moderate");
    expect(referenceSupportLevelKey(0.41)).toBe("weak");
    expect(referenceSupportLevelKey(0.33)).toBe("unsupported");
  });
});

describe("renderReferencesMarkdown", () => {
  it("renders Portuguese references copy for pt-BR", () => {
    const items: ReferenceItem[] = [
      {
        claim: "Engenharia em produção",
        chunk: klarnaChunk,
        score: 0.82,
      },
    ];
    const md = renderReferencesMarkdown(items, "pt-BR");
    expect(md).toContain("## Referências");
    expect(md).toContain("Nível de suporte: Forte");
    expect(md).toContain("Similaridade (secundária): 82%");
    expect(md).toContain("Fonte:");
  });

  it("renders strong matches with source label and excerpt", () => {
    const items: ReferenceItem[] = [
      {
        claim: "Production fintech engineering",
        chunk: klarnaChunk,
        score: 0.82,
      },
    ];
    const md = renderReferencesMarkdown(items);
    expect(md).toContain("## References");
    expect(md).toContain("1. **Production fintech engineering**");
    expect(md).toContain(
      "[\\[experience\\]](/en#section-experience-item-0) Klarna"
    );
    expect(md).toContain("Support level: Strong");
    expect(md).toContain("Similarity (secondary): 82%");
    expect(md).toContain("Fintech engineering at Klarna");
  });

  it("renders below-threshold concrete match with source and confidence caveat", () => {
    const items: ReferenceItem[] = [
      {
        claim: "Cross-functional collaboration with PMs",
        chunk: klarnaChunk,
        score: 0.21,
      },
    ];
    const md = renderReferencesMarkdown(items);
    expect(md).toContain(
      "[\\[experience\\]](/en#section-experience-item-0) Klarna"
    );
    expect(md).toContain("Support level: Unsupported — manual review");
    expect(md).toContain("Similarity (secondary): 21%");
    expect(md).toContain(
      "below confidence threshold (40%), please double check"
    );
    expect(md).not.toContain("Lacking vector matching evidence");
  });

  it("skips rag-evidence when the best concrete match scores lower than rag would", () => {
    const ragChunk: EmbeddingChunk = {
      ...sagaChunk,
      embedding: [1, 0, 0],
    };
    const expChunk: EmbeddingChunk = {
      ...klarnaChunk,
      embedding: [0.5, 0.5, 0],
    };
    const queryEmbedding = [1, 0, 0];
    const concrete = filterChunksForReferenceMatching([ragChunk, expChunk]);
    const result = findBestMatch(concrete, queryEmbedding);
    expect(result.chunk?.id).toBe("klarna");
    const md = renderReferencesMarkdown([
      { claim: "Distributed systems ownership", ...result },
    ]);
    expect(md).toContain("section-experience-item-0");
    expect(md).not.toContain("section-rag-evidence-en");
  });

  it("renders lacking evidence when the corpus has only rag-evidence chunks", () => {
    const concrete = filterChunksForReferenceMatching([sagaChunk]);
    const result = findBestMatch(concrete, [1, 0, 0]);
    expect(result.chunk).toBeNull();
    const md = renderReferencesMarkdown([
      { claim: "Some claim", chunk: result.chunk, score: result.score },
    ]);
    expect(md).toContain("Lacking vector matching evidence");
    expect(md).toContain("please double check");
  });

  it("falls back to sectionId or generic label when category is missing", () => {
    const noCategoryChunk: EmbeddingChunk = {
      ...sagaChunk,
      metadata: {
        locale: "en",
        sectionId: "impact",
        title: "Architectural ownership",
      },
    };
    const items: ReferenceItem[] = [
      { claim: "Architecture ownership", chunk: noCategoryChunk, score: 0.6 },
      { claim: "Untyped content", chunk: titlelessChunk, score: 0.55 },
    ];
    const md = renderReferencesMarkdown(items);
    expect(md).toContain("[impact] Architectural ownership");
    expect(md).toContain("Portfolio source");
  });

  it("derives href from chunk id when locale/scrollTargetId metadata is missing", () => {
    const chunk: EmbeddingChunk = {
      id: "en-section-experience-item-2-s0-p0",
      text: "Contract delivery narrative.",
      embedding: [1, 0, 0],
      metadata: {
        title: "Confidential Client (Contract)",
        category: "experience",
      },
    };
    const items: ReferenceItem[] = [
      { claim: "Cross-functional delivery", chunk, score: 0.72 },
    ];
    const md = renderReferencesMarkdown(items);
    expect(md).toContain(
      "[\\[experience\\]](/en#section-experience-item-2) Confidential Client (Contract)"
    );
  });

  it("does not wrap Source in a markdown link when scrollTargetId is missing", () => {
    const chunkNoScroll: EmbeddingChunk = {
      ...klarnaChunk,
      metadata: {
        locale: "en",
        sectionId: "experience",
        title: "Klarna",
        category: "experience",
      },
    };
    const items: ReferenceItem[] = [
      {
        claim: "Production fintech engineering",
        chunk: chunkNoScroll,
        score: 0.82,
      },
    ];
    const md = renderReferencesMarkdown(items);
    expect(md).toContain("[experience] Klarna");
    expect(md).not.toContain("](/en#");
  });

  it("truncates long excerpts with an ellipsis", () => {
    const longChunk: EmbeddingChunk = {
      id: "long",
      text: "A".repeat(400),
      embedding: [1, 0, 0],
      metadata: { title: "Long" },
    };
    const items: ReferenceItem[] = [
      { claim: "Very long evidence", chunk: longChunk, score: 0.7 },
    ];
    const md = renderReferencesMarkdown(items);
    expect(md).toContain("…");
    expect(md).not.toContain("A".repeat(400));
  });

  it("positive claims render with source label and support level", () => {
    const items: ReferenceItem[] = [
      {
        claim: "Kafka-based orchestration using sagas",
        chunk: klarnaChunk,
        score: 0.72,
      },
    ];
    const md = renderReferencesMarkdown(items);
    expect(md).toContain("Kafka-based orchestration");
    expect(md).toContain("Support level: Strong");
    expect(md).toContain("Similarity (secondary): 72%");
  });
});

describe("buildClaimExtractionPromptForTest", () => {
  it("instructs extractor to capture positive claims and gap labels", () => {
    const prompt = buildClaimExtractionPromptForTest("some assessment text");
    expect(prompt).toContain("positive");
    expect(prompt).toContain("Do NOT put these in claims");
    expect(prompt).toContain("Absence claims");
    expect(prompt).toContain("not evidenced");
    expect(prompt).toContain("gap statements");
  });

  it("explicitly excludes gap/absence statements from extracted claims array", () => {
    const prompt = buildClaimExtractionPromptForTest("some assessment text");
    expect(prompt).toContain("Absence claims, gap statements");
    expect(prompt).toContain("is not evidenced");
    expect(prompt).toContain("is missing from the portfolio");
  });

  it("still guides extractor toward production ownership evidence", () => {
    const prompt = buildClaimExtractionPromptForTest("some assessment text");
    expect(prompt).toContain("Production fintech engineering at Klarna");
    expect(prompt).toContain("Observability and SLO practice");
  });

  it("includes gap extraction instructions with examples", () => {
    const prompt = buildClaimExtractionPromptForTest("some assessment text");
    expect(prompt).toContain("**gaps**");
    expect(prompt).toContain("Production Golang ownership");
    expect(prompt).toContain("German fluency");
    expect(prompt).toContain("Formal Staff-level RFC");
  });

  it("requires both claims and gaps arrays in structured output", () => {
    const prompt = buildClaimExtractionPromptForTest("some assessment text");
    expect(prompt).toContain("Always return both top-level arrays");
    expect(prompt).toContain(
      "Use an empty array when there are no important gaps"
    );
  });
});

describe("renderReferencesMarkdown with gaps", () => {
  it("renders Not Evidenced subsection when gaps are provided", () => {
    const items: ReferenceItem[] = [
      {
        claim: "Kafka event-driven orchestration",
        chunk: klarnaChunk,
        score: 0.72,
      },
    ];
    const gaps = ["Production Golang ownership", "German fluency"];
    const md = renderReferencesMarkdown(items, "en", gaps);
    expect(md).toContain("## Not Evidenced in Retrieved Portfolio Excerpts");
    expect(md).toContain("- Production Golang ownership");
    expect(md).toContain("- German fluency");
  });

  it("omits Not Evidenced subsection when gaps array is empty", () => {
    const items: ReferenceItem[] = [
      { claim: "Fintech engineering", chunk: klarnaChunk, score: 0.8 },
    ];
    const md = renderReferencesMarkdown(items, "en", []);
    expect(md).not.toContain("Not Evidenced");
  });

  it("does not force-match gap items to nearest vector chunks", () => {
    const gaps = ["Go runtime optimization", "Database lock optimization"];
    const md = renderReferencesMarkdown([], "en", gaps);
    expect(md).toContain("## Not Evidenced in Retrieved Portfolio Excerpts");
    expect(md).toContain("- Go runtime optimization");
    expect(md).not.toContain("Source:");
    expect(md).not.toContain("Support level:");
  });

  it("renders localized Not Evidenced heading for pt-BR", () => {
    const md = renderReferencesMarkdown([], "pt-BR", ["Fluência em alemão"]);
    expect(md).toContain(
      "## Não evidenciado nos trechos do portfólio recuperados"
    );
    expect(md).toContain("- Fluência em alemão");
  });
});

describe("splitSentencesForTest", () => {
  it("splits text on sentence boundaries", () => {
    const sentences = splitSentencesForTest(
      "First sentence. Second sentence! Third?"
    );
    expect(sentences).toHaveLength(3);
    expect(sentences[0]).toBe("First sentence.");
    expect(sentences[1]).toBe("Second sentence!");
    expect(sentences[2]).toBe("Third?");
  });

  it("returns single element for text without sentence-ending punctuation", () => {
    const sentences = splitSentencesForTest("no punctuation at the end");
    expect(sentences).toHaveLength(1);
  });
});

describe("formatExcerptForTest (sentence-level relevance)", () => {
  it("selects the most relevant sentence window from a chunk", () => {
    const chunkText =
      "Daniel built tracing and metrics infrastructure for production systems. " +
      "He established 24/7 on-call ownership for reliability and production support. " +
      "The team scaled to handle 50k requests per second.";
    const claim = "24/7 on-call ownership for reliability/production support";
    const excerpt = formatExcerptForTest(chunkText, claim);
    expect(excerpt).toContain("on-call");
    expect(excerpt).toContain("reliability");
  });

  it("falls back to chunk start when no sentence matches the claim", () => {
    const chunkText =
      "Alpha beta gamma delta epsilon. Zeta eta theta iota kappa. " +
      "Lambda mu nu xi omicron. Pi rho sigma tau upsilon.";
    const claim = "completely unrelated technology";
    const excerpt = formatExcerptForTest(chunkText, claim);
    expect(excerpt).toContain("Alpha");
  });

  it("returns full text when under the character limit", () => {
    const short = "Short text about Kafka delivery.";
    const excerpt = formatExcerptForTest(short, "Kafka delivery");
    expect(excerpt).toBe(short);
  });

  it("works without a claim (backward compatibility)", () => {
    const text = "A".repeat(300);
    const excerpt = formatExcerptForTest(text);
    expect(excerpt).toContain("…");
    expect(excerpt.length).toBeLessThanOrEqual(221);
  });
});
