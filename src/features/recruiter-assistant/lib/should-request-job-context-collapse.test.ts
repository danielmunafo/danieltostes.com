import { describe, expect, it } from "vitest";
import { shouldRequestJobContextCollapse } from "./should-request-job-context-collapse";
import { THINKING_CLOSE_MARKER } from "./split-thinking-from-body";

const USER_ID = "user-1";

describe("shouldRequestJobContextCollapse", () => {
  it("keeps the latest user message expanded while status is submitted", () => {
    const messages = [{ id: USER_ID, role: "user" }];
    expect(
      shouldRequestJobContextCollapse(messages, USER_ID, "submitted", null)
    ).toBe(false);
  });

  it("keeps expanded while streaming before assistant row exists", () => {
    const messages = [{ id: USER_ID, role: "user" }];
    expect(
      shouldRequestJobContextCollapse(messages, USER_ID, "streaming", null)
    ).toBe(false);
  });

  it("keeps expanded while streaming after assistant row but before thinking end", () => {
    const messages = [
      { id: USER_ID, role: "user" },
      { id: "assistant-1", role: "assistant" },
    ];
    expect(
      shouldRequestJobContextCollapse(
        messages,
        USER_ID,
        "streaming",
        "partial evidence without close marker"
      )
    ).toBe(false);
  });

  it("requests collapse once assistant text includes thinking end marker", () => {
    const messages = [
      { id: USER_ID, role: "user" },
      { id: "assistant-1", role: "assistant" },
    ];
    expect(
      shouldRequestJobContextCollapse(
        messages,
        USER_ID,
        "streaming",
        `brief\n${THINKING_CLOSE_MARKER}\n`
      )
    ).toBe(true);
  });

  it("requests collapse for prior user messages", () => {
    const messages = [
      { id: "user-old", role: "user" },
      { id: "assistant-old", role: "assistant" },
      { id: USER_ID, role: "user" },
    ];
    expect(
      shouldRequestJobContextCollapse(messages, "user-old", "ready", null)
    ).toBe(true);
  });

  it("requests collapse when the request ends (ready)", () => {
    const messages = [{ id: USER_ID, role: "user" }];
    expect(
      shouldRequestJobContextCollapse(messages, USER_ID, "ready", null)
    ).toBe(true);
  });

  it("requests collapse when assistant exists and status is ready", () => {
    const messages = [
      { id: USER_ID, role: "user" },
      { id: "assistant-1", role: "assistant" },
    ];
    expect(
      shouldRequestJobContextCollapse(messages, USER_ID, "ready", "any")
    ).toBe(true);
  });
});
