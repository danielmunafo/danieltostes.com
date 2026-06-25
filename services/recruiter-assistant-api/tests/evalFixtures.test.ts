import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { computeHardGateAssessment } from "../src/rag/hardGates/computeHardGateAssessment.js";
import {
  hardGateRequirementRowSchema,
  type HardGateRequirementRow,
} from "../src/rag/hardGates/schema.js";
import {
  filterChunksForReferenceMatching,
  findBestMatch,
  referenceSupportLevelKey,
  renderReferencesMarkdown,
  type ReferenceSupportLevelKey,
} from "../src/rag/references.js";
import type { EmbeddingChunk } from "../src/rag/retrieve.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../..");

type RecommendationLabel =
  | "strong_pursue"
  | "pursue"
  | "maybe_validate"
  | "weak_fit"
  | "skip";

type HardGateExpected = {
  missingHardGateCount?: number;
  effectiveMaxTechnicalFit?: number;
  effectiveMaxTechnicalFitLte?: number;
  effectiveMaxTechnicalFitGte?: number;
  blockedRecommendations?: RecommendationLabel[];
  blockedRecommendationsIncludes?: RecommendationLabel[];
  allowedRecommendations?: RecommendationLabel[];
  allowedRecommendationsIncludes?: RecommendationLabel[];
  allowedRecommendationsSubset?: RecommendationLabel[];
  rulesFiredIncludes?: string[];
};

type HardGateFixtureCase = {
  test_id: string;
  query: string;
  rows: unknown[];
  expected: HardGateExpected;
};

type ReferenceExpected = {
  matchedChunkId?: string;
  minSimilarity?: number;
  maxSimilarity?: number;
  supportLevel?: ReferenceSupportLevelKey;
  supportLevelAny?: ReferenceSupportLevelKey[];
  chunkTextContainsAll?: string[];
  chunkTextContainsAny?: string[];
  belowThresholdCaveat?: boolean;
  sourceLinkContains?: string;
  notEvidencedSection?: boolean;
  gapTerms?: string[];
  noPositiveCitation?: boolean;
  forbiddenSectionIds?: string[];
};

type ReferenceFixtureCase = {
  test_id: string;
  claim: string;
  queryEmbedding?: number[];
  chunks?: EmbeddingChunk[];
  gaps?: string[];
  expected: ReferenceExpected;
};

function readFixture<T>(pathFromRepoRoot: string): T {
  return JSON.parse(
    readFileSync(join(repoRoot, pathFromRepoRoot), "utf8")
  ) as T;
}

function containsAll(text: string, terms: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return terms.every((term) => lower.includes(term.toLowerCase()));
}

function containsAny(text: string, terms: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function parseHardGateRows(rows: readonly unknown[]): HardGateRequirementRow[] {
  return rows.map((row) => hardGateRequirementRowSchema.parse(row));
}

const hardGateCases = readFixture<{ cases: HardGateFixtureCase[] }>(
  "evals/hard-gates/cases.json"
).cases;

const referenceCases = readFixture<{ cases: ReferenceFixtureCase[] }>(
  "evals/references/cases.json"
).cases;

describe("hard-gate eval fixtures", () => {
  it.each(hardGateCases)("$test_id: $query", (fixture) => {
    const rows = parseHardGateRows(fixture.rows);
    const assessment = computeHardGateAssessment(rows);
    const { expected } = fixture;

    if (expected.missingHardGateCount !== undefined) {
      expect(assessment.missingHardGateCount).toBe(
        expected.missingHardGateCount
      );
    }

    if (expected.effectiveMaxTechnicalFit !== undefined) {
      expect(assessment.effectiveMaxTechnicalFit).toBe(
        expected.effectiveMaxTechnicalFit
      );
    }

    if (expected.effectiveMaxTechnicalFitLte !== undefined) {
      expect(assessment.effectiveMaxTechnicalFit).toBeLessThanOrEqual(
        expected.effectiveMaxTechnicalFitLte
      );
    }

    if (expected.effectiveMaxTechnicalFitGte !== undefined) {
      expect(assessment.effectiveMaxTechnicalFit).toBeGreaterThanOrEqual(
        expected.effectiveMaxTechnicalFitGte
      );
    }

    if (expected.blockedRecommendations) {
      expect(assessment.blockedRecommendations).toEqual(
        expected.blockedRecommendations
      );
    }

    if (expected.blockedRecommendationsIncludes) {
      expect(assessment.blockedRecommendations).toEqual(
        expect.arrayContaining(expected.blockedRecommendationsIncludes)
      );
    }

    if (expected.allowedRecommendations) {
      expect(assessment.allowedRecommendations).toEqual(
        expected.allowedRecommendations
      );
    }

    if (expected.allowedRecommendationsIncludes) {
      expect(assessment.allowedRecommendations).toEqual(
        expect.arrayContaining(expected.allowedRecommendationsIncludes)
      );
    }

    if (expected.allowedRecommendationsSubset) {
      const outsideExpectedSubset = assessment.allowedRecommendations.filter(
        (label) => !expected.allowedRecommendationsSubset?.includes(label)
      );
      expect(outsideExpectedSubset).toEqual([]);
    }

    if (expected.rulesFiredIncludes) {
      expect(assessment.rulesFired).toEqual(
        expect.arrayContaining(expected.rulesFiredIncludes)
      );
    }
  });
});

describe("reference eval fixtures", () => {
  it.each(referenceCases)("$test_id: $claim", (fixture) => {
    const { expected } = fixture;

    if (fixture.gaps && !fixture.queryEmbedding) {
      const markdown = renderReferencesMarkdown([], "en", fixture.gaps);

      if (expected.notEvidencedSection) {
        expect(markdown).toMatch(/^## Not Evidenced/im);
      }
      if (expected.gapTerms) {
        expect(containsAll(markdown, expected.gapTerms)).toBe(true);
      }
      if (expected.noPositiveCitation) {
        expect(markdown).not.toMatch(/^\s*-\s+Source:/im);
      }
      return;
    }

    expect(fixture.queryEmbedding).toBeDefined();
    const chunks = fixture.chunks ?? [];
    const eligibleChunks = filterChunksForReferenceMatching(chunks);
    const match = findBestMatch(eligibleChunks, fixture.queryEmbedding ?? []);
    const supportLevel = referenceSupportLevelKey(match.score);
    const markdown = renderReferencesMarkdown(
      [{ claim: fixture.claim, chunk: match.chunk, score: match.score }],
      "en"
    );
    const matchedChunkText = match.chunk?.text ?? "";

    if (expected.matchedChunkId) {
      expect(match.chunk?.id).toBe(expected.matchedChunkId);
    }

    if (expected.forbiddenSectionIds) {
      expect(expected.forbiddenSectionIds).not.toContain(
        match.chunk?.metadata?.sectionId
      );
    }

    if (expected.minSimilarity !== undefined) {
      expect(match.score).toBeGreaterThanOrEqual(expected.minSimilarity);
    }

    if (expected.maxSimilarity !== undefined) {
      expect(match.score).toBeLessThan(expected.maxSimilarity);
    }

    if (expected.supportLevel) {
      expect(supportLevel).toBe(expected.supportLevel);
    }

    if (expected.supportLevelAny) {
      expect(expected.supportLevelAny).toContain(supportLevel);
    }

    if (expected.chunkTextContainsAll) {
      expect(containsAll(matchedChunkText, expected.chunkTextContainsAll)).toBe(
        true
      );
    }

    if (expected.chunkTextContainsAny) {
      expect(containsAny(matchedChunkText, expected.chunkTextContainsAny)).toBe(
        true
      );
    }

    if (expected.belowThresholdCaveat !== undefined) {
      expect(/below confidence threshold/i.test(markdown)).toBe(
        expected.belowThresholdCaveat
      );
    }

    if (expected.sourceLinkContains) {
      expect(markdown).toContain(expected.sourceLinkContains);
    }
  });
});
