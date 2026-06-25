import { describe, expect, it } from "vitest";
import { computeHardGateAssessment } from "../src/rag/hardGates/computeHardGateAssessment.js";
import type { HardGateRequirementRow } from "../src/rag/hardGates/schema.js";

function row(
  overrides: Partial<HardGateRequirementRow> &
    Pick<HardGateRequirementRow, "requirement" | "category">
): HardGateRequirementRow {
  return {
    evidenceLevel: "not_evidenced",
    requirementImportance: "must_have",
    isHardGate: true,
    severity: "major",
    jdSuggestsFlexibility: false,
    rationale: "test",
    ...overrides,
  };
}

describe("computeHardGateAssessment", () => {
  it("returns cap 10 and all recommendations when no hard gates miss", () => {
    const assessment = computeHardGateAssessment([
      row({
        requirement: "TypeScript production",
        category: "primary_stack",
        evidenceLevel: "direct",
      }),
    ]);
    expect(assessment.maxTechnicalFit).toBe(10);
    expect(assessment.missingHardGateCount).toBe(0);
    expect(assessment.allowedRecommendations).toContain("strong_pursue");
    expect(assessment.blockedRecommendations).toHaveLength(0);
    expect(assessment.rulesFired).toContain("no_hard_gate_miss");
  });

  it("ignores non-language practical constraints as hard gates", () => {
    const assessment = computeHardGateAssessment([
      row({
        requirement: "EU work authorization",
        category: "work_authorization",
      }),
      row({
        requirement: "CET timezone overlap",
        category: "timezone",
      }),
      row({
        requirement: "Full-time employee only",
        category: "employment_type",
      }),
    ]);
    expect(assessment.maxTechnicalFit).toBe(10);
    expect(assessment.missingHardGateCount).toBe(0);
    expect(assessment.allowedRecommendations).toContain("strong_pursue");
    expect(assessment.allowedRecommendations).toContain("pursue");
    expect(assessment.rulesFired).toContain("no_hard_gate_miss");
  });

  it("caps at 6 for one role-defining hard gate missing", () => {
    const assessment = computeHardGateAssessment([
      row({
        requirement: "Legacy PHP Symfony band",
        category: "specialist_domain",
        evidenceLevel: "adjacent",
      }),
    ]);
    expect(assessment.maxTechnicalFit).toBe(6);
    expect(assessment.rulesFired).toContain(
      "one_role_defining_hard_gate_cap_6"
    );
    expect(assessment.blockedRecommendations).toEqual(["strong_pursue"]);
  });

  it("caps at 6 for one mandatory spoken-language gate", () => {
    const assessment = computeHardGateAssessment([
      row({
        requirement: "German fluency",
        category: "spoken_language",
      }),
    ]);
    expect(assessment.maxTechnicalFit).toBe(6);
    expect(assessment.rulesFired).toContain(
      "one_role_defining_hard_gate_cap_6"
    );
    expect(assessment.blockedRecommendations).toEqual(["strong_pursue"]);
  });

  it("caps at 5 for missing primary stack", () => {
    const assessment = computeHardGateAssessment([
      row({
        requirement: "Production Golang",
        category: "primary_stack",
      }),
    ]);
    expect(assessment.maxTechnicalFit).toBe(5);
    expect(assessment.rulesFired).toContain("primary_stack_missing_cap_5");
    expect(assessment.blockedRecommendations).toContain("pursue");
  });

  it("caps at 5 for two or more role-defining gates missing", () => {
    const assessment = computeHardGateAssessment([
      row({ requirement: "German fluency", category: "spoken_language" }),
      row({ requirement: "Production Golang", category: "primary_stack" }),
    ]);
    expect(assessment.maxTechnicalFit).toBe(4);
    expect(assessment.rulesFired).toContain(
      "practical_plus_other_hard_gate_cap_4"
    );
    expect(assessment.blockedRecommendations).toEqual([
      "strong_pursue",
      "pursue",
    ]);
    expect(assessment.allowedRecommendations).toEqual(["weak_fit", "skip"]);
  });

  it("allows maybe_validate only when practical and stack miss with flexibility", () => {
    const assessment = computeHardGateAssessment([
      row({
        requirement: "German fluency",
        category: "spoken_language",
        jdSuggestsFlexibility: true,
      }),
      row({
        requirement: "Production Golang",
        category: "primary_stack",
        jdSuggestsFlexibility: true,
      }),
    ]);
    expect(assessment.allowedRecommendations).toEqual([
      "maybe_validate",
      "weak_fit",
      "skip",
    ]);
    expect(assessment.allowedRecommendations).not.toContain("pursue");
  });

  it("flexibility does not rescue pursue when practical and stack miss", () => {
    const assessment = computeHardGateAssessment([
      row({
        requirement: "German fluency",
        category: "spoken_language",
        jdSuggestsFlexibility: true,
      }),
      row({
        requirement: "Production Golang",
        category: "primary_stack",
      }),
    ]);
    expect(assessment.blockedRecommendations).toContain("pursue");
    expect(assessment.allowedRecommendations).not.toContain("pursue");
  });

  it("computes effectiveMaxTechnicalFit as min of evaluator and hard gate cap", () => {
    const assessment = computeHardGateAssessment(
      [row({ requirement: "Production Golang", category: "primary_stack" })],
      7
    );
    expect(assessment.evaluatorRecommendedFit).toBe(7);
    expect(assessment.effectiveMaxTechnicalFit).toBe(5);
  });

  it("sets shouldOpenVerdictWithCaution when gates miss and cap is low", () => {
    const assessment = computeHardGateAssessment([
      row({ requirement: "German fluency", category: "spoken_language" }),
      row({ requirement: "Production Golang", category: "primary_stack" }),
    ]);
    expect(assessment.shouldOpenVerdictWithCaution).toBe(true);
    expect(assessment.hasHardGateMiss).toBe(true);
  });

  it("ignores nice-to-have rows for missing counts", () => {
    const assessment = computeHardGateAssessment([
      row({
        requirement: "German fluency",
        category: "spoken_language",
        requirementImportance: "nice_to_have",
      }),
    ]);
    expect(assessment.missingHardGateCount).toBe(0);
    expect(assessment.maxTechnicalFit).toBe(10);
  });
});
