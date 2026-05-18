import { describe, expect, it } from "vitest";
import { recruiterAgent } from "../src/recruiterAssistant/agents/recruiter/recruiterAgent.js";

describe("recruiterAgent.evaluateOffTopic", () => {
  it("detects localized off-topic evaluator brief", () => {
    expect(recruiterAgent.evaluateOffTopic("# Off-topic input\n\nBody\n")).toBe(
      true
    );
    expect(
      recruiterAgent.evaluateOffTopic("# Requirement Coverage\n| a |")
    ).toBe(false);
  });
});
