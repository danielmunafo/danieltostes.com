import { describe, expect, it } from "vitest";
import { buildEvidenceBriefForPitch } from "../src/recruiterAssistant/pipeline/buildEvidenceBriefForPitch.js";

describe("buildEvidenceBriefForPitch", () => {
  it("joins evaluator and analyst markdown with separator", () => {
    const brief = buildEvidenceBriefForPitch(
      "# Evaluator\nRow one",
      "# Analyst\nSummary"
    );
    expect(brief).toContain("# Evaluator");
    expect(brief).toContain("# Analyst");
    expect(brief).toContain("\n\n---\n\n");
  });

  it("uses placeholders when sections are empty", () => {
    const brief = buildEvidenceBriefForPitch("", "");
    expect(brief).toContain("(No evaluator output.)");
    expect(brief).toContain("(No analyst brief produced.)");
  });
});
