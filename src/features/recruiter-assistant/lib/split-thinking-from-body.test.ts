import { describe, expect, it } from "vitest";
import {
  BRIEFING_PREP_CLOSE_MARKER,
  BRIEFING_PREP_OPEN_MARKER,
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

const emptySuffixFields = {
  chartData: null,
  hasChartMarkerOpen: false,
  briefingPrep: "",
  isBriefingPrepStreaming: false,
};

describe("splitThinkingFromBody", () => {
  it("returns the body unchanged when no marker is present", () => {
    const out = splitThinkingFromBody("just some pitch text");
    expect(out).toEqual({
      thinking: "",
      body: "just some pitch text",
      isThinkingStreaming: false,
      hasThinking: false,
      ...emptySuffixFields,
    });
  });

  it("marks thinking as streaming when only the open marker is present", () => {
    const out = splitThinkingFromBody(
      `${THINKING_OPEN_MARKER}\n# Brief\nsome partial`
    );
    expect(out.hasThinking).toBe(true);
    expect(out.isThinkingStreaming).toBe(true);
    expect(out.thinking).toBe("# Brief\nsome partial");
    expect(out.body).toBe("");
    expect(out.chartData).toBeNull();
  });

  it("extracts thinking and body when both markers are present", () => {
    const text = `${THINKING_OPEN_MARKER}\n# Brief\nbody here\n${THINKING_CLOSE_MARKER}\n\n## Candidate Fit Assessment\nPitch content.`;
    const out = splitThinkingFromBody(text);
    expect(out.hasThinking).toBe(true);
    expect(out.isThinkingStreaming).toBe(false);
    expect(out.thinking).toBe("# Brief\nbody here");
    expect(out.body).toBe("## Candidate Fit Assessment\nPitch content.");
    expect(out.chartData).toBeNull();
  });

  it("preserves text before the open marker as part of the body", () => {
    const text = `prefix\n${THINKING_OPEN_MARKER}\nx\n${THINKING_CLOSE_MARKER}\nafter`;
    const out = splitThinkingFromBody(text);
    expect(out.body).toBe("prefix\n\nafter");
    expect(out.thinking).toBe("x");
  });

  it("parses chart data and strips markers from body", () => {
    const text = `${THINKING_OPEN_MARKER}\nbrief\n${THINKING_CLOSE_MARKER}\n\n${CHART_DATA_OPEN_MARKER}${sampleChartJson}${CHART_DATA_CLOSE_MARKER}\n\n# Verdict\nStrong fit.`;
    const out = splitThinkingFromBody(text);
    expect(out.chartData).not.toBeNull();
    expect(out.chartData?.assessmentSummary.technicalFit).toBe(8);
    expect(out.body).toBe("# Verdict\nStrong fit.");
    expect(out.body).not.toContain(CHART_DATA_OPEN_MARKER);
    expect(out.body).not.toContain("backendArchitecture");
  });

  it("returns null chartData for malformed JSON without leaking markers", () => {
    const text = `${THINKING_CLOSE_MARKER}\n${CHART_DATA_OPEN_MARKER}{not-json${CHART_DATA_CLOSE_MARKER}\n\n# Verdict\nok`;
    const out = splitThinkingFromBody(`${THINKING_OPEN_MARKER}\nx\n${text}`);
    expect(out.chartData).toBeNull();
    expect(out.body).not.toContain(CHART_DATA_OPEN_MARKER);
    expect(out.body).toContain("# Verdict");
  });

  it("does not parse chart when only open chart marker is present", () => {
    const text = `${THINKING_OPEN_MARKER}\nbrief\n${THINKING_CLOSE_MARKER}\n\n${CHART_DATA_OPEN_MARKER}{"partial":`;
    const out = splitThinkingFromBody(text);
    expect(out.chartData).toBeNull();
    expect(out.hasChartMarkerOpen).toBe(true);
    expect(out.body).not.toContain(CHART_DATA_OPEN_MARKER);
  });

  it("parses chart block without thinking markers", () => {
    const text = `${CHART_DATA_OPEN_MARKER}${sampleChartJson}${CHART_DATA_CLOSE_MARKER}\n\n# Verdict\nok`;
    const out = splitThinkingFromBody(text);
    expect(out.chartData).not.toBeNull();
    expect(out.body).toBe("# Verdict\nok");
  });

  it("extracts streaming briefing prep line and strips markers", () => {
    const text = `${THINKING_OPEN_MARKER}\nbrief\n${THINKING_CLOSE_MARKER}\n\n${BRIEFING_PREP_OPEN_MARKER}Mapping must-have rows to capability axes${BRIEFING_PREP_CLOSE_MARKER}\n\n${CHART_DATA_OPEN_MARKER}${sampleChartJson}${CHART_DATA_CLOSE_MARKER}\n\n# Verdict\nok`;
    const out = splitThinkingFromBody(text);
    expect(out.briefingPrep).toBe("Mapping must-have rows to capability axes");
    expect(out.isBriefingPrepStreaming).toBe(false);
    expect(out.body).toBe("# Verdict\nok");
    expect(out.body).not.toContain(BRIEFING_PREP_OPEN_MARKER);
  });

  it("marks briefing prep as streaming when close marker is missing", () => {
    const text = `${THINKING_OPEN_MARKER}\nbrief\n${THINKING_CLOSE_MARKER}\n\n${BRIEFING_PREP_OPEN_MARKER}Scoring backend and`;
    const out = splitThinkingFromBody(text);
    expect(out.isBriefingPrepStreaming).toBe(true);
    expect(out.briefingPrep).toBe("Scoring backend and");
    expect(out.body).toBe("");
  });

  it("parses chart when open marker arrives before json (streaming chart build)", () => {
    const text = `${THINKING_OPEN_MARKER}\nbrief\n${THINKING_CLOSE_MARKER}\n\n${CHART_DATA_OPEN_MARKER}${BRIEFING_PREP_OPEN_MARKER}Scoring axes${BRIEFING_PREP_CLOSE_MARKER}`;
    const partial = splitThinkingFromBody(text);
    expect(partial.hasChartMarkerOpen).toBe(true);
    expect(partial.chartData).toBeNull();

    const complete = `${text}${sampleChartJson}${CHART_DATA_CLOSE_MARKER}\n\n# Verdict\nok`;
    const out = splitThinkingFromBody(complete);
    expect(out.chartData?.assessmentSummary.technicalFit).toBe(8);
    expect(out.hasChartMarkerOpen).toBe(false);
    expect(out.body).toBe("# Verdict\nok");
  });

  it("parses orphan chart json when start marker was stripped from prep block", () => {
    const text = `${THINKING_OPEN_MARKER}\nbrief\n${THINKING_CLOSE_MARKER}\n\n${BRIEFING_PREP_OPEN_MARKER}prep${BRIEFING_PREP_CLOSE_MARKER}\n\n${sampleChartJson}${CHART_DATA_CLOSE_MARKER}\n\n# Verdict\nok`;
    const out = splitThinkingFromBody(text);
    expect(out.chartData?.assessmentSummary.technicalFit).toBe(8);
    expect(out.body).toBe("# Verdict\nok");
    expect(out.body).not.toContain("assessmentSummary");
  });

  it("parses chart after pitch markdown and uses the last chart block", () => {
    const firstChart = JSON.stringify({
      assessmentSummary: {
        technicalFit: 6,
        evidenceConfidence: "Medium",
        recommendation: "Pursue",
      },
      capabilityDimensions: JSON.parse(sampleChartJson).capabilityDimensions,
    });
    const secondChart = sampleChartJson;
    const text = `${THINKING_OPEN_MARKER}\nbrief\n${THINKING_CLOSE_MARKER}\n\n${CHART_DATA_OPEN_MARKER}${firstChart}${CHART_DATA_CLOSE_MARKER}\n\n# Verdict\nok\n\n# Scores\n- **Technical fit:** 8/10\n\n${CHART_DATA_OPEN_MARKER}${secondChart}${CHART_DATA_CLOSE_MARKER}`;
    const out = splitThinkingFromBody(text);
    expect(out.chartData?.assessmentSummary.technicalFit).toBe(8);
    expect(out.body).toContain("# Verdict");
    expect(out.body).not.toContain(CHART_DATA_OPEN_MARKER);
  });
});
