import { describe, expect, it } from "vitest";
import {
  buildProjectedUserMessage,
  estimateRecruiterChatMessagesJsonChars,
  toRecruiterRequestMessages,
  wouldExceedRecruiterChatHistoryLimit,
} from "./chat-payload-size";

describe("chat-payload-size", () => {
  it("strips ids and matches useChat wire fields", () => {
    const wire = toRecruiterRequestMessages([
      {
        id: "x",
        role: "user",
        content: "hello",
        parts: [{ type: "text", text: "hello" }],
      } as never,
    ]);
    expect(wire).toEqual([
      {
        role: "user",
        content: "hello",
        parts: [{ type: "text", text: "hello" }],
      },
    ]);
  });

  it("projected user message includes content and parts", () => {
    expect(buildProjectedUserMessage("jd")).toEqual({
      role: "user",
      content: "jd",
      parts: [{ type: "text", text: "jd" }],
    });
  });

  it("detects when history plus next message exceeds limit", () => {
    const history = [
      { role: "user", content: "a".repeat(12_000) },
      { role: "assistant", content: "b".repeat(12_000) },
    ];
    const maxChars = 32_768;
    expect(estimateRecruiterChatMessagesJsonChars(history)).toBeLessThan(
      maxChars
    );
    expect(
      wouldExceedRecruiterChatHistoryLimit(
        history,
        "c".repeat(10_000),
        maxChars
      )
    ).toBe(true);
    expect(
      wouldExceedRecruiterChatHistoryLimit(history, "short", maxChars)
    ).toBe(false);
  });
});
