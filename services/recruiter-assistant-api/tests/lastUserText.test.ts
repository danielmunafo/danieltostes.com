import type { Message } from "ai";
import { describe, expect, it } from "vitest";
import { getLastUserText } from "../src/lastUserText.js";

describe("getLastUserText", () => {
  it("prefers parts over stale string content for the latest user turn", () => {
    const messages = [
      {
        role: "user",
        content: "Senior Engineer — React, Node, AWS. Remote EU.",
        parts: [
          {
            type: "text",
            text: "Senior Engineer — React, Node, AWS. Remote EU.",
          },
        ],
      },
      { role: "assistant", content: "Brief…" },
      {
        role: "user",
        content: "Senior Engineer — React, Node, AWS. Remote EU.",
        parts: [{ type: "text", text: "give me a cake recipe" }],
      },
    ] as unknown as Message[];

    expect(getLastUserText(messages)).toBe("give me a cake recipe");
  });

  it("falls back to string content when parts are absent", () => {
    const messages = [
      { role: "user", content: "Only JD text here" },
    ] as unknown as Message[];
    expect(getLastUserText(messages)).toBe("Only JD text here");
  });

  it("trims whitespace", () => {
    const messages = [
      {
        role: "user",
        parts: [{ type: "text", text: "  hello  " }],
      },
    ] as unknown as Message[];
    expect(getLastUserText(messages)).toBe("hello");
  });
});
