import { describe, expect, it } from "vitest";
import { matchesObviousOffTopicHeuristic } from "../src/security/intentGate.js";

describe("matchesObviousOffTopicHeuristic", () => {
  it("flags news and recipe probes from the UI", () => {
    expect(
      matchesObviousOffTopicHeuristic("tell me the most recent news")
    ).toBe(true);
    expect(matchesObviousOffTopicHeuristic("give me a cake recipe then")).toBe(
      true
    );
    expect(matchesObviousOffTopicHeuristic("give me a cake recipe")).toBe(true);
  });

  it("does not flag typical JD-shaped text", () => {
    expect(
      matchesObviousOffTopicHeuristic(
        "Senior TypeScript engineer — payments team, remote EU. 5+ years, AWS, Kafka."
      )
    ).toBe(false);
    expect(
      matchesObviousOffTopicHeuristic(
        "Hi Daniel, I have a backend role at a fintech in Berlin. Are you open to a quick chat?"
      )
    ).toBe(false);
  });

  it("is empty-safe", () => {
    expect(matchesObviousOffTopicHeuristic("")).toBe(false);
    expect(matchesObviousOffTopicHeuristic("   ")).toBe(false);
  });
});
