import { describe, expect, it } from "vitest";
import {
  EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN,
  getAgentInstruction,
  listAgentInstructionPaths,
} from "../src/recruiterAssistant/prompt/getAgentInstruction.js";

describe("getAgentInstruction", () => {
  it("loads every registered instruction path with non-empty content", () => {
    for (const path of listAgentInstructionPaths()) {
      expect(getAgentInstruction(path).trim().length).toBeGreaterThan(0);
    }
  });

  it("throws for unknown instruction paths", () => {
    expect(() =>
      getAgentInstruction(
        "agents/missing/instructions.md" as Parameters<
          typeof getAgentInstruction
        >[0]
      )
    ).toThrow(/Missing or empty agent instruction/);
  });

  it("exports hard cap rules from evidence evaluation instructions", () => {
    expect(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN).toContain("Hard score caps");
    expect(
      getAgentInstruction("agents/evidenceEvaluation/instructions.md")
    ).toBe(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN);
  });
});
