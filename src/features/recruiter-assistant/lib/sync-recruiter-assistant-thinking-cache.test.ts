import { describe, expect, it } from "vitest";
import type { ThinkingSplit } from "./split-thinking-from-body";
import {
  mergedThinkingMarkdownForEvidence,
  shouldMountEvidenceReviewPanel,
} from "./sync-recruiter-assistant-thinking-cache";

const emptySplitBase = (): ThinkingSplit => ({
  thinking: "",
  body: "",
  isThinkingStreaming: false,
  hasThinking: false,
  chartData: null,
  hasChartMarkerOpen: false,
  briefingPrep: "",
  isBriefingPrepStreaming: false,
});

describe("sync-recruiter-assistant-thinking-cache", () => {
  it("prefer live thinking over cache while streaming", () => {
    const cache = new Map<string, string>([["msg-1", "ignored"]]);
    expect(
      mergedThinkingMarkdownForEvidence(
        "msg-1",
        {
          ...emptySplitBase(),
          thinking: "## Live evidence",
          hasThinking: true,
        },
        cache
      )
    ).toBe("## Live evidence");
  });

  it("fills from cache when serialized message loses thinking segment", () => {
    expect(
      mergedThinkingMarkdownForEvidence(
        "msg-1",
        {
          ...emptySplitBase(),
          hasThinking: false,
          thinking: "",
          body: "# Pitch\nonly",
        },
        new Map([["msg-1", "## Cached evidence"]])
      )
    ).toBe("## Cached evidence");

    expect(
      shouldMountEvidenceReviewPanel(
        {
          ...emptySplitBase(),
          hasThinking: false,
          thinking: "",
          body: "",
        },
        "## Cached evidence"
      )
    ).toBe(true);
  });
});
