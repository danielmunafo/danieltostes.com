import { describe, expect, it } from "vitest";
import { chartDataSchema } from "../src/rag/chartDataSchema.js";
import { parseEvaluatorMatchMetadata } from "../src/rag/parseEvaluatorMatchMetadata.js";
import { parseEvaluatorRequirementEvidence } from "../src/rag/parseEvaluatorRequirementEvidence.js";
import {
  allowedRecommendationsForFitCeiling,
  normalizeChartEvidenceScorePairings,
  parseAndValidateChartData,
  validateChartData,
} from "../src/rag/validateChartData.js";
import { normalizeBriefingPrepStatusText } from "../src/rag/briefingPrepStatusPrompt.js";
import {
  buildChartProjectionSystemPrompt,
  buildChartProjectionUserPrompt,
} from "../src/rag/chartProjectionPrompt.js";
import { computeHardGateAssessment } from "../src/rag/hardGates/computeHardGateAssessment.js";
import type { HardGateRequirementRow } from "../src/rag/hardGates/schema.js";

const validEvaluatorEn = `# Requirement Coverage

| Requirement | Importance | Evidence Level | Notes |
|---|---|---|---|
| Backend microservices | Must-have | Direct | TypeScript and Java ownership in excerpts. |
| SLOs and incidents | Must-have | Direct | Production reliability themes evidenced. |
| Terraform CI/CD | Must-have | Direct | Cloud delivery in excerpts. |
| JD stack band | Must-have | Adjacent | Strong platform; one named stack adjacent. |

# Match Score Guidance

**Recommended match strength:** 8/10
**Reason:** Strong core fit.
**Evidence confidence:** High
**Evidence confidence reason:** Most must-haves are direct.
**Score caps applied:** None`;

const mixedEvidenceEvaluatorEn = `# Requirement Coverage

| Requirement | Importance | Evidence Level | Notes |
|---|---|---|---|
| Backend microservices | Must-have | Direct | Evidenced. |
| Golang ownership | Must-have | Not evidenced | No Go excerpts. |
| React UI | Must-have | Direct | Frontend ownership evidenced. |
| Workflow engine | Must-have | Adjacent | Patterns only, not named engine. |

# Match Score Guidance

**Recommended match strength:** 8/10
**Reason:** Strong platform with stack gaps.
**Evidence confidence:** Medium
**Evidence confidence reason:** Mixed must-have evidence.
**Score caps applied:** None`;

function makeValidChart(overrides?: {
  technicalFit?: number;
  recommendation?: "Pursue";
}) {
  return {
    assessmentSummary: {
      technicalFit: overrides?.technicalFit ?? 8,
      evidenceConfidence: "High" as const,
      recommendation: overrides?.recommendation ?? ("Pursue" as const),
    },
    capabilityDimensions: [
      {
        key: "backendArchitecture" as const,
        label: "Backend / architecture",
        score: 9,
        evidenceLevel: "direct" as const,
        rationale: "Production TypeScript and Java ownership in excerpts.",
      },
      {
        key: "reliabilityObservability" as const,
        label: "Reliability / observability",
        score: 9,
        evidenceLevel: "direct" as const,
        rationale: "SLOs and incident response evidenced.",
      },
      {
        key: "cloudDevops" as const,
        label: "Cloud / DevOps",
        score: 8,
        evidenceLevel: "direct" as const,
        rationale: "Terraform and CI/CD in production.",
      },
      {
        key: "roleSpecificStackFit" as const,
        label: "Stack fit",
        score: 7,
        evidenceLevel: "mixed" as const,
        rationale: "Strong platform fit; one JD stack band adjacent.",
      },
    ],
  };
}

describe("chartDataSchema", () => {
  it("accepts valid chart data", () => {
    const result = chartDataSchema.safeParse(makeValidChart());
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 4 dimensions", () => {
    const chart = makeValidChart();
    const result = chartDataSchema.safeParse({
      ...chart,
      capabilityDimensions: chart.capabilityDimensions.slice(0, 3),
    });
    expect(result.success).toBe(false);
  });
});

describe("parseEvaluatorRequirementEvidence", () => {
  it("parses evidence level counts from requirement table", () => {
    const summary = parseEvaluatorRequirementEvidence(validEvaluatorEn, "en");
    expect(summary).toEqual({
      rowCount: 4,
      directCount: 3,
      adjacentCount: 1,
      notEvidencedCount: 0,
      contradictoryCount: 0,
      unknownCount: 0,
      hasMixedEvidenceLevels: true,
    });
  });

  it("detects mixed evidence in evaluator table", () => {
    const summary = parseEvaluatorRequirementEvidence(
      mixedEvidenceEvaluatorEn,
      "en"
    );
    expect(summary?.hasMixedEvidenceLevels).toBe(true);
    expect(summary?.directCount).toBe(2);
    expect(summary?.adjacentCount).toBe(1);
    expect(summary?.notEvidencedCount).toBe(1);
  });

  it("returns null when requirement table is missing", () => {
    expect(
      parseEvaluatorRequirementEvidence(
        validEvaluatorEn.split("\n").slice(8).join("\n"),
        "en"
      )
    ).toBeNull();
  });
});

describe("parseEvaluatorMatchMetadata", () => {
  it("parses English evaluator match guidance", () => {
    const meta = parseEvaluatorMatchMetadata(validEvaluatorEn, "en");
    expect(meta).toEqual({
      technicalFitCeiling: 8,
      evidenceConfidence: "High",
    });
  });

  it("parses plain-text labels without bold (common model output)", () => {
    const plain = `# Match Score Guidance

Recommended match strength: 9/10
Reason: Strong fit.
Evidence confidence: High
Evidence confidence reason: Most must-haves are direct.
Score caps applied: None`;
    const meta = parseEvaluatorMatchMetadata(plain, "en");
    expect(meta).toEqual({
      technicalFitCeiling: 9,
      evidenceConfidence: "High",
    });
  });

  it("parses bold confidence value", () => {
    const boldConf = `# Match Score Guidance

**Recommended match strength:** 8/10
**Evidence confidence:** **High**
**Reason:** ok`;
    const meta = parseEvaluatorMatchMetadata(boldConf, "en");
    expect(meta?.evidenceConfidence).toBe("High");
    expect(meta?.technicalFitCeiling).toBe(8);
  });

  it("returns null when heading is missing", () => {
    expect(parseEvaluatorMatchMetadata("no guidance here", "en")).toBeNull();
  });

  it("parses h2 match score guidance heading", () => {
    const h2 = `## Match Score Guidance

**Recommended match strength:** 9/10
**Evidence confidence:** High
**Reason:** Strong fit.`;
    expect(parseEvaluatorMatchMetadata(h2, "en")).toEqual({
      technicalFitCeiling: 9,
      evidenceConfidence: "High",
    });
  });

  it("parses technical fit label alias and spaced score", () => {
    const alias = `# Match Score Guidance

- **Technical fit:** 9 / 10
- **Evidence confidence:** High
- **Reason:** ok`;
    expect(parseEvaluatorMatchMetadata(alias, "en")).toEqual({
      technicalFitCeiling: 9,
      evidenceConfidence: "High",
    });
  });

  it("parses when evidence confidence reason appears before confidence", () => {
    const reordered = `# Match Score Guidance

Recommended match strength: 8/10
Evidence confidence reason: Mixed gaps on stack band.
Evidence confidence: Medium
Reason: ok`;
    expect(parseEvaluatorMatchMetadata(reordered, "en")).toEqual({
      technicalFitCeiling: 8,
      evidenceConfidence: "Medium",
    });
  });
});

describe("parseAndValidateChartData", () => {
  it("accepts chart aligned with evaluator", () => {
    const chart = makeValidChart();
    const validated = parseAndValidateChartData(chart, validEvaluatorEn, "en");
    expect(validated).not.toBeNull();
    expect(validated?.assessmentSummary.technicalFit).toBe(8);
  });

  it("accepts chart when evaluator uses plain-text match guidance lines", () => {
    const plainEvaluator = `# Match Score Guidance

Recommended match strength: 9/10
Reason: Strong fit.
Evidence confidence: High
Evidence confidence reason: Direct on core rows.
Score caps applied: None`;
    const chart = makeValidChart({ technicalFit: 9, recommendation: "Pursue" });
    const validated = parseAndValidateChartData(chart, plainEvaluator, "en");
    expect(validated).not.toBeNull();
  });

  it("rejects duplicate dimension keys", () => {
    const chart = makeValidChart();
    const dims = [
      ...chart.capabilityDimensions,
      { ...chart.capabilityDimensions[0] },
    ];
    const validated = parseAndValidateChartData(
      { ...chart, capabilityDimensions: dims },
      validEvaluatorEn,
      "en"
    );
    expect(validated).toBeNull();
  });

  it("rejects direct evidence with score below 8", () => {
    const chart = makeValidChart();
    chart.capabilityDimensions[0] = {
      ...chart.capabilityDimensions[0],
      score: 6,
      evidenceLevel: "direct",
    };
    expect(parseAndValidateChartData(chart, validEvaluatorEn, "en")).toBeNull();
  });

  it("normalizes direct@7 to direct@8 so validation can pass", () => {
    const chart = makeValidChart();
    const cloudDevopsIndex = chart.capabilityDimensions.findIndex(
      (dim) => dim.key === "cloudDevops"
    );
    chart.capabilityDimensions[cloudDevopsIndex] = {
      ...chart.capabilityDimensions[cloudDevopsIndex],
      score: 7,
      evidenceLevel: "direct",
    };
    const { chart: normalized, adjustments } =
      normalizeChartEvidenceScorePairings(chart);
    expect(adjustments).toEqual(["cloudDevops:direct@7->8"]);
    expect(
      parseAndValidateChartData(normalized, validEvaluatorEn, "en")
    ).not.toBeNull();
  });

  it("rejects technical fit above evaluator ceiling", () => {
    const chart = makeValidChart({ technicalFit: 9 });
    expect(parseAndValidateChartData(chart, validEvaluatorEn, "en")).toBeNull();
  });

  it("rejects chart Pursue at 6/10 when hard gates cap at 4", () => {
    const evaluatorSix = validEvaluatorEn.replace(
      "**Recommended match strength:** 8/10",
      "**Recommended match strength:** 6/10"
    );
    const chart = makeValidChart({
      technicalFit: 6,
      recommendation: "Pursue",
    });
    chart.assessmentSummary.evidenceConfidence = "Medium";
    const hardGateAssessment = computeHardGateAssessment([
      {
        requirement: "German fluency",
        category: "spoken_language",
        evidenceLevel: "not_evidenced",
        requirementImportance: "must_have",
        isHardGate: true,
        severity: "major",
        jdSuggestsFlexibility: false,
        rationale: "test",
      } satisfies HardGateRequirementRow,
      {
        requirement: "Production Golang",
        category: "primary_stack",
        evidenceLevel: "not_evidenced",
        requirementImportance: "must_have",
        isHardGate: true,
        severity: "major",
        jdSuggestsFlexibility: false,
        rationale: "test",
      } satisfies HardGateRequirementRow,
    ]);
    const outcome = validateChartData(
      chart,
      evaluatorSix,
      "en",
      hardGateAssessment
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect([
        "technical_fit_exceeds_ceiling",
        "recommendation_not_in_fit_band",
      ]).toContain(outcome.reason);
    }
  });

  it("rejects confidence mismatch", () => {
    const chart = makeValidChart();
    chart.assessmentSummary.evidenceConfidence = "Low";
    expect(parseAndValidateChartData(chart, validEvaluatorEn, "en")).toBeNull();
  });

  it("rejects recommendation outside fit band", () => {
    const chart = makeValidChart();
    chart.assessmentSummary.recommendation = "Skip";
    expect(parseAndValidateChartData(chart, validEvaluatorEn, "en")).toBeNull();
    const outcome = validateChartData(chart, validEvaluatorEn, "en");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.reason).toBe("recommendation_not_in_fit_band");
    }
  });

  it("accepts structurally valid chart when evaluator metadata cannot be parsed", () => {
    const chart = makeValidChart();
    const validated = parseAndValidateChartData(chart, "no metadata", "en");
    expect(validated).not.toBeNull();
    expect(validated?.assessmentSummary.technicalFit).toBe(8);
  });

  it("parses match metadata from document tail without markdown heading", () => {
    const tailOnly = `# Requirement Coverage
| Backend | Must-have | Direct | ok |

Some analysis text without a match score heading block.
Recommended match strength: 9/10
Evidence confidence: High
Reason: Strong fit.`;
    expect(parseEvaluatorMatchMetadata(tailOnly, "en")).toEqual({
      technicalFitCeiling: 9,
      evidenceConfidence: "High",
    });
  });

  it("rejects five or more dimensions with identical scores", () => {
    const uniformScores = Array.from({ length: 5 }, (_, index) => ({
      key: (
        [
          "backendArchitecture",
          "frontendProductUi",
          "workflowOrchestration",
          "integrations",
          "cloudDevops",
        ] as const
      )[index],
      label: `Dim ${index}`,
      score: 9,
      evidenceLevel: "direct" as const,
      rationale: "Mapped direct rows for this capability area.",
    }));
    const chart = {
      ...makeValidChart({ technicalFit: 9, recommendation: "Pursue" }),
      capabilityDimensions: uniformScores,
    };
    const evaluator = `# Requirement Coverage

| Requirement | Importance | Evidence Level | Notes |
|---|---|---|---|
| A | Must-have | Direct | ok |
| B | Must-have | Direct | ok |

# Match Score Guidance

**Recommended match strength:** 9/10
**Reason:** Strong.
**Evidence confidence:** High
**Evidence confidence reason:** ok
**Score caps applied:** None`;
    const outcome = validateChartData(chart, evaluator, "en");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.reason).toBe("uniform_dimension_scores");
    }
  });

  it("rejects uniform scores when evaluator requirement table is mixed", () => {
    const chart = {
      assessmentSummary: {
        technicalFit: 8,
        evidenceConfidence: "Medium" as const,
        recommendation: "Pursue" as const,
      },
      capabilityDimensions: [
        {
          key: "backendArchitecture" as const,
          label: "Backend",
          score: 9,
          evidenceLevel: "direct" as const,
          rationale: "Direct backend rows.",
        },
        {
          key: "roleSpecificStackFit" as const,
          label: "Stack",
          score: 9,
          evidenceLevel: "direct" as const,
          rationale: "Incorrectly uniform.",
        },
        {
          key: "domainFit" as const,
          label: "Domain",
          score: 9,
          evidenceLevel: "direct" as const,
          rationale: "Incorrectly uniform.",
        },
        {
          key: "cloudDevops" as const,
          label: "Cloud",
          score: 9,
          evidenceLevel: "direct" as const,
          rationale: "Incorrectly uniform.",
        },
      ],
    };
    const outcome = validateChartData(chart, mixedEvidenceEvaluatorEn, "en");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.reason).toBe(
        "uniform_scores_with_mixed_evaluator_evidence"
      );
    }
  });

  it("rejects when every dimension score mirrors technicalFit", () => {
    const allDirectEvaluator = `# Requirement Coverage

| Requirement | Importance | Evidence Level | Notes |
|---|---|---|---|
| Backend | Must-have | Direct | ok |
| Cloud | Must-have | Direct | ok |
| Reliability | Must-have | Direct | ok |
| Integrations | Must-have | Direct | ok |

# Match Score Guidance

**Recommended match strength:** 8/10
**Reason:** Strong.
**Evidence confidence:** High
**Evidence confidence reason:** ok
**Score caps applied:** None`;
    const chart = {
      assessmentSummary: {
        technicalFit: 8,
        evidenceConfidence: "High" as const,
        recommendation: "Pursue" as const,
      },
      capabilityDimensions: [
        {
          key: "backendArchitecture" as const,
          label: "Backend",
          score: 8,
          evidenceLevel: "direct" as const,
          rationale: "Direct rows.",
        },
        {
          key: "cloudDevops" as const,
          label: "Cloud",
          score: 8,
          evidenceLevel: "direct" as const,
          rationale: "Direct rows.",
        },
        {
          key: "reliabilityObservability" as const,
          label: "Reliability",
          score: 8,
          evidenceLevel: "direct" as const,
          rationale: "Direct rows.",
        },
        {
          key: "integrations" as const,
          label: "Integrations",
          score: 8,
          evidenceLevel: "direct" as const,
          rationale: "Direct rows.",
        },
      ],
    };
    const outcome = validateChartData(chart, allDirectEvaluator, "en");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.reason).toBe("all_dimension_scores_match_technical_fit");
    }
  });
});

describe("allowedRecommendationsForFitCeiling", () => {
  it("allows Pursue for ceiling 8", () => {
    expect(allowedRecommendationsForFitCeiling(8)).toContain("Pursue");
  });
});

describe("chartProjectionPrompt", () => {
  it("requires per-dimension mapping and score variation", () => {
    const system = buildChartProjectionSystemPrompt();
    expect(system).toContain("scoring each capability axis independently");
    expect(system).toContain("weakest decisive");
    expect(system).toContain("backendArchitecture");
    expect(system).toContain("must differ");
    expect(system).toContain("120");
    const compact = buildChartProjectionSystemPrompt(true);
    expect(compact).toContain("COMPACT MODE");
    expect(normalizeBriefingPrepStatusText(" line one \n line two ")).toBe(
      "line one\nline two"
    );
    const user = buildChartProjectionUserPrompt(
      "JD",
      validEvaluatorEn,
      "analyst"
    );
    expect(user).toContain(validEvaluatorEn);
    expect(user).toContain("target 6-8");
    expect(user).toContain("Vary scores across dimensions");
    const withHardGates = buildChartProjectionUserPrompt(
      "JD",
      validEvaluatorEn,
      "analyst",
      "Deterministic hard gate assessment\n- Effective max technical fit: 4/10"
    );
    expect(withHardGates).toContain("Backend-enforced hard gate assessment");
    expect(withHardGates).toContain("Effective max technical fit: 4/10");
  });
});
