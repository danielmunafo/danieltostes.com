import { describe, expect, it } from "vitest";
import {
  splitThinkingFromBody,
  THINKING_CLOSE_MARKER,
  THINKING_OPEN_MARKER,
} from "./split-thinking-from-body";

describe("splitThinkingFromBody", () => {
  it("returns the body unchanged when no marker is present", () => {
    const out = splitThinkingFromBody("just some pitch text");
    expect(out).toEqual({
      thinking: "",
      body: "just some pitch text",
      isThinkingStreaming: false,
      hasThinking: false,
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
  });

  it("extracts thinking and body when both markers are present", () => {
    const text = `${THINKING_OPEN_MARKER}\n# Brief\nbody here\n${THINKING_CLOSE_MARKER}\n\n## Candidate Fit Assessment\nPitch content.`;
    const out = splitThinkingFromBody(text);
    expect(out.hasThinking).toBe(true);
    expect(out.isThinkingStreaming).toBe(false);
    expect(out.thinking).toBe("# Brief\nbody here");
    expect(out.body).toBe("## Candidate Fit Assessment\nPitch content.");
  });

  it("preserves text before the open marker as part of the body", () => {
    const text = `prefix\n${THINKING_OPEN_MARKER}\nx\n${THINKING_CLOSE_MARKER}\nafter`;
    const out = splitThinkingFromBody(text);
    expect(out.body).toBe("prefix\n\nafter");
    expect(out.thinking).toBe("x");
  });
});
