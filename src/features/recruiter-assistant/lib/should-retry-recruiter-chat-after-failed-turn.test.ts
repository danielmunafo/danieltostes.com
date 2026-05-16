import { describe, expect, it } from "vitest";
import { shouldRetryRecruiterChatAfterFailedTurn } from "./should-retry-recruiter-chat-after-failed-turn";

describe("shouldRetryRecruiterChatAfterFailedTurn", () => {
  it("returns true after a failed user-only turn with draft input", () => {
    expect(
      shouldRetryRecruiterChatAfterFailedTurn(
        "error",
        [{ role: "user" }],
        " revised jd "
      )
    ).toBe(true);
  });

  it("returns false when status is ready", () => {
    expect(
      shouldRetryRecruiterChatAfterFailedTurn("ready", [{ role: "user" }], "jd")
    ).toBe(false);
  });

  it("returns false when the last message is from the assistant", () => {
    expect(
      shouldRetryRecruiterChatAfterFailedTurn(
        "error",
        [{ role: "user" }, { role: "assistant" }],
        "jd"
      )
    ).toBe(false);
  });

  it("returns false when the composer is empty", () => {
    expect(
      shouldRetryRecruiterChatAfterFailedTurn("error", [{ role: "user" }], "  ")
    ).toBe(false);
  });
});
