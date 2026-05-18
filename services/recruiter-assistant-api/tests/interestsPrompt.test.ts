import { describe, expect, it } from "vitest";
import { INTERESTS_OUTPUT_SKIP_SENTINEL } from "../src/constants.js";
import {
  buildInterestsEvaluatorSystemPrompt,
  buildInterestsEvaluatorUserPrompt,
} from "../src/rag/interestsPrompt.js";

describe("buildInterestsEvaluatorSystemPrompt", () => {
  it("requires pack-only dimensions and privacy rules", () => {
    const s = buildInterestsEvaluatorSystemPrompt("en");
    expect(s).toContain("criteriaMarkdown");
    expect(s).toContain("quote private numbers");
    expect(s).toContain(INTERESTS_OUTPUT_SKIP_SENTINEL);
    expect(s).toContain("# Preference Alignment");
    expect(s).toContain("Aligned");
    expect(s).toContain("Dealbreaker");
  });

  it("uses localized headings for pt-BR", () => {
    const s = buildInterestsEvaluatorSystemPrompt("pt-BR");
    expect(s).toContain("# Alinhamento de preferências");
    expect(s).toContain("Alinhado");
    expect(s).toContain("A discutir");
  });
});

describe("buildInterestsEvaluatorUserPrompt", () => {
  it("embeds criteria and JD with localized table header", () => {
    const u = buildInterestsEvaluatorUserPrompt(
      "en",
      "Senior engineer remote",
      "- Remote: yes\n"
    );
    expect(u).toContain("Senior engineer remote");
    expect(u).toContain("- Remote: yes");
    expect(u).toContain("| Dimension | Inferred from JD | Alignment | Notes |");
  });
});
