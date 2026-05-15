import { describe, expect, it } from "vitest";
import { computeHardGateAssessment } from "../src/rag/hardGates/computeHardGateAssessment.js";
import { validateAndClampPitchHardGates } from "../src/rag/hardGates/enforcePitchOutput.js";
import type { HardGateRequirementRow } from "../src/rag/hardGates/schema.js";

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

describe("validateAndClampPitchHardGates", () => {
  it("clamps Technical fit and Pursue when gates block pursue", () => {
    const assessment = computeHardGateAssessment([
      missingRow("German fluency", "spoken_language"),
      missingRow("Production Golang", "primary_stack"),
    ]);
    const pitch = `# Verdict
Partial fit.

# Scores
- **Technical fit:** 7/10
- **Evidence confidence:** Medium
- **Recommendation:** **Pursue**

# Why It Matches
- x
`;
    const result = validateAndClampPitchHardGates(pitch, assessment, "en");
    expect(result.clamped).toBe(true);
    expect(result.text).toContain("Technical fit:** 4/10");
    expect(result.text).not.toContain("**Pursue**");
    expect(result.text).toMatch(/Weak fit|Maybe \/ validate first/);
  });

  it("leaves compliant pitch unchanged", () => {
    const assessment = computeHardGateAssessment([]);
    const pitch = `# Scores
- **Technical fit:** 8/10
- **Recommendation:** **Strong pursue**
`;
    const result = validateAndClampPitchHardGates(pitch, assessment, "en");
    expect(result.clamped).toBe(false);
    expect(result.text).toContain("8/10");
  });
});
