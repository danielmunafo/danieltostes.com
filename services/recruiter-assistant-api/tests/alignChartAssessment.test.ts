import { describe, expect, it } from "vitest";
import {
  alignChartAssessmentWithHardGates,
  alignChartAssessmentWithPitch,
} from "../src/rag/alignChartAssessment.js";
import { parsePitchAssessmentSummary } from "../src/rag/parsePitchAssessmentSummary.js";
import { computeHardGateAssessment } from "../src/rag/hardGates/computeHardGateAssessment.js";
import type { HardGateRequirementRow } from "../src/rag/hardGates/schema.js";
import type { ChartData } from "../src/rag/chartDataSchema.js";

function missingRow(
  requirement: string,
  category: HardGateRequirementRow["category"]
): HardGateRequirementRow {
  return {
    requirement,
    category,
    evidenceLevel: "not_evidenced",
    requirementImportance: "must_have",
    isHardGate: true,
    severity: "major",
    jdSuggestsFlexibility: false,
    rationale: "test",
  };
}

function sampleChart(summary: ChartData["assessmentSummary"]): ChartData {
  return {
    assessmentSummary: summary,
    capabilityDimensions: [
      {
        key: "backendArchitecture",
        label: "Backend",
        score: 7,
        evidenceLevel: "mixed",
        rationale: "Strong platform; stack gaps.",
      },
      {
        key: "roleSpecificStackFit",
        label: "Stack fit",
        score: 3,
        evidenceLevel: "not_evidenced",
        rationale: "Golang not evidenced.",
      },
      {
        key: "domainFit",
        label: "Domain / language",
        score: 3,
        evidenceLevel: "not_evidenced",
        rationale: "German not evidenced.",
      },
      {
        key: "cloudDevops",
        label: "Cloud",
        score: 8,
        evidenceLevel: "direct",
        rationale: "Terraform evidenced.",
      },
    ],
  };
}

describe("parsePitchAssessmentSummary", () => {
  it("parses technical fit, confidence, and recommendation from Scores", () => {
    const pitch = `# Verdict
Not a strong match as written.

# Scores
- **Technical fit:** 4/10
- **Evidence confidence:** Medium
- **Recommendation:** **Weak fit**
- **Reason:** Missing Golang and German.

# Why It Matches
- x`;
    expect(parsePitchAssessmentSummary(pitch, "en")).toEqual({
      technicalFit: 4,
      evidenceConfidence: "Medium",
      recommendation: "Weak fit",
    });
  });
});

describe("alignChartAssessmentWithHardGates", () => {
  it("clamps optimistic chart summary to hard gate cap and allowed recommendation", () => {
    const assessment = computeHardGateAssessment([
      missingRow("German fluency", "spoken_language"),
      missingRow("Production Golang", "primary_stack"),
    ]);
    const chart = sampleChart({
      technicalFit: 6,
      evidenceConfidence: "Medium",
      recommendation: "Pursue",
    });
    const result = alignChartAssessmentWithHardGates(chart, assessment);
    expect(result.adjusted).toBe(true);
    expect(result.chart.assessmentSummary.technicalFit).toBe(4);
    expect(result.chart.assessmentSummary.recommendation).toBe("Weak fit");
  });
});

describe("alignChartAssessmentWithPitch", () => {
  it("overwrites chart summary with pitch Scores (pitch prevails)", () => {
    const chart = sampleChart({
      technicalFit: 6,
      evidenceConfidence: "Medium",
      recommendation: "Pursue",
    });
    const pitch = `# Scores
- **Technical fit:** 4/10
- **Evidence confidence:** Medium
- **Recommendation:** **Weak fit**
`;
    const result = alignChartAssessmentWithPitch(chart, pitch, "en");
    expect(result.adjusted).toBe(true);
    expect(result.chart.assessmentSummary).toEqual({
      technicalFit: 4,
      evidenceConfidence: "Medium",
      recommendation: "Weak fit",
    });
  });
});
