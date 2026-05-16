import { describe, expect, it } from "vitest";
import { mergeRecruiterChatRequestBody } from "./merge-recruiter-chat-request-body";

describe("mergeRecruiterChatRequestBody", () => {
  it("returns body unchanged when token is absent", () => {
    const raw = JSON.stringify({ messages: [], locale: "en" });
    expect(mergeRecruiterChatRequestBody(raw, null)).toBe(raw);
    expect(mergeRecruiterChatRequestBody(raw, "  ")).toBe(raw);
  });

  it("merges recaptchaToken into the JSON body", () => {
    const raw = JSON.stringify({ messages: [{ role: "user" }], locale: "en" });
    const merged = mergeRecruiterChatRequestBody(raw, "token-abc");
    expect(JSON.parse(merged)).toEqual({
      messages: [{ role: "user" }],
      locale: "en",
      recaptchaToken: "token-abc",
    });
  });
});
