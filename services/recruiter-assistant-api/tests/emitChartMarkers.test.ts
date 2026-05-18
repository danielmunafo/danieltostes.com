import { describe, expect, it } from "vitest";
import {
  CHART_DATA_CLOSE_MARKER,
  CHART_DATA_OPEN_MARKER,
} from "../src/constants.js";
import {
  emitPrePitchChartData,
  reemitChartDataAfterPitchSync,
} from "../src/recruiterAssistant/chart/emitChartMarkers.js";
import type { ChartData } from "../src/rag/chartDataSchema.js";
import type { RecruiterDataStream } from "../src/recruiterAssistant/types.js";

function createCaptureStream(): RecruiterDataStream & { parts: string[] } {
  const parts: string[] = [];
  return {
    parts,
    write(part: string) {
      parts.push(part);
    },
  } as RecruiterDataStream & { parts: string[] };
}

const sampleChart: ChartData = {
  assessmentSummary: {
    technicalFit: 7,
    evidenceConfidence: "Medium",
    recommendation: "Pursue",
  },
  capabilityDimensions: [
    {
      key: "backendArchitecture",
      label: "Backend",
      score: 8,
      evidenceLevel: "direct",
      rationale: "Evidence in excerpts.",
    },
  ],
};

describe("emitChartMarkers", () => {
  it("writes close marker only when chart data is null (pre-pitch)", () => {
    const dataStream = createCaptureStream();
    emitPrePitchChartData({
      dataStream,
      chartData: null,
      navLocale: "en",
    });
    const text = dataStream.parts.join("");
    expect(text).toContain(CHART_DATA_CLOSE_MARKER);
    expect(text).not.toContain(CHART_DATA_OPEN_MARKER);
  });

  it("writes json and close marker when chart data exists (pre-pitch)", () => {
    const dataStream = createCaptureStream();
    emitPrePitchChartData({
      dataStream,
      chartData: sampleChart,
      navLocale: "en",
    });
    const text = dataStream.parts.join("");
    expect(text).toContain("technicalFit");
    expect(text).toContain(CHART_DATA_CLOSE_MARKER);
    expect(text).not.toContain(CHART_DATA_OPEN_MARKER);
  });

  it("re-emits full open+json+close block after pitch sync", () => {
    const dataStream = createCaptureStream();
    reemitChartDataAfterPitchSync({
      dataStream,
      chartData: sampleChart,
      navLocale: "en",
    });
    const text = dataStream.parts.join("");
    expect(text).toContain(CHART_DATA_OPEN_MARKER);
    expect(text).toContain(CHART_DATA_CLOSE_MARKER);
    expect(text).toContain("technicalFit");
  });
});
