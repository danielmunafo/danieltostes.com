import { describe, expect, it } from "vitest";
import { getRecruiterAssistantMessagePlainText } from "./getRecruiterAssistantMessagePlainText";
import {
  CHART_DATA_CLOSE_MARKER,
  CHART_DATA_OPEN_MARKER,
  splitThinkingFromBody,
  THINKING_CLOSE_MARKER,
  THINKING_OPEN_MARKER,
} from "./split-thinking-from-body";

const sampleChartJson = JSON.stringify({
  assessmentSummary: {
    technicalFit: 8,
    evidenceConfidence: "High",
    recommendation: "Pursue",
  },
  capabilityDimensions: [
    {
      key: "backendArchitecture",
      label: "Backend / architecture",
      score: 9,
      evidenceLevel: "direct",
      rationale: "Production ownership evidenced.",
    },
    {
      key: "reliabilityObservability",
      label: "Reliability / observability",
      score: 9,
      evidenceLevel: "direct",
      rationale: "SLOs and incidents in excerpts.",
    },
    {
      key: "cloudDevops",
      label: "Cloud / DevOps",
      score: 8,
      evidenceLevel: "direct",
      rationale: "Terraform and CI/CD.",
    },
    {
      key: "roleSpecificStackFit",
      label: "Stack fit",
      score: 7,
      evidenceLevel: "mixed",
      rationale: "Strong platform; one band adjacent.",
    },
  ],
});

describe("getRecruiterAssistantMessagePlainText", () => {
  it("joins interleaved text and reasoning parts in order", () => {
    const text = `${THINKING_OPEN_MARKER}\n# Evidence\nok\n${THINKING_CLOSE_MARKER}\n\n${CHART_DATA_OPEN_MARKER}${sampleChartJson}${CHART_DATA_CLOSE_MARKER}\n\n# Pitch\nHi`;
    const openEnd = text.indexOf("\n", text.indexOf(THINKING_OPEN_MARKER)) + 1;
    const closeStart = text.indexOf(THINKING_CLOSE_MARKER);
    const beforeReasoning = text.slice(0, openEnd);
    const reasoningChunk = text.slice(openEnd, closeStart);
    const afterReasoning = text.slice(closeStart);

    const plain = getRecruiterAssistantMessagePlainText({
      parts: [
        { type: "text", text: beforeReasoning },
        { type: "reasoning", reasoning: reasoningChunk },
        { type: "text", text: afterReasoning },
      ],
    });

    expect(plain).toBe(text);
    const split = splitThinkingFromBody(plain);
    expect(split.hasThinking).toBe(true);
    expect(split.chartData).not.toBeNull();
    expect(split.body).toContain("# Pitch");
  });

  it("falls back to content when parts are absent", () => {
    expect(
      getRecruiterAssistantMessagePlainText({ content: "hello", parts: [] })
    ).toBe("hello");
  });

  it("prepends legacy reasoning before content when parts are absent", () => {
    expect(
      getRecruiterAssistantMessagePlainText({
        reasoning: "R",
        content: "C",
      })
    ).toBe("RC");
  });
});
