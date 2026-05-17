import { describe, expect, it } from "vitest";
import {
  THINKING_OPEN_MARKER,
  THINKING_CLOSE_MARKER,
  CHART_DATA_OPEN_MARKER,
  CHART_DATA_CLOSE_MARKER,
  BRIEFING_PREP_OPEN_MARKER,
  BRIEFING_PREP_CLOSE_MARKER,
} from "../src/constants.js";

/** Contract: marker strings must stay stable for the Next.js stream splitter. */
describe("stream marker contract", () => {
  it("exposes expected marker literals", () => {
    expect(THINKING_OPEN_MARKER).toBe("[[THINKING_START]]");
    expect(THINKING_CLOSE_MARKER).toBe("[[THINKING_END]]");
    expect(CHART_DATA_OPEN_MARKER).toBe("[[CHART_DATA_START]]");
    expect(CHART_DATA_CLOSE_MARKER).toBe("[[CHART_DATA_END]]");
    expect(BRIEFING_PREP_OPEN_MARKER).toBe("[[BRIEFING_PREP_START]]");
    expect(BRIEFING_PREP_CLOSE_MARKER).toBe("[[BRIEFING_PREP_END]]");
  });
});
