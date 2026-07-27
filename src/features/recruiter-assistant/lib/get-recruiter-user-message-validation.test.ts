import { describe, expect, it } from "vitest";
import { RECRUITER_USER_MESSAGE_MAX_CHARS } from "../constants/request-contract";
import { getRecruiterUserMessageValidation } from "./get-recruiter-user-message-validation";

describe("getRecruiterUserMessageValidation", () => {
  it("accepts input at the API character limit", () => {
    expect(
      getRecruiterUserMessageValidation(
        "x".repeat(RECRUITER_USER_MESSAGE_MAX_CHARS)
      )
    ).toEqual({
      characterCount: RECRUITER_USER_MESSAGE_MAX_CHARS,
      charactersOverLimit: 0,
      isTooLong: false,
    });
  });

  it("reports how many characters must be removed", () => {
    expect(
      getRecruiterUserMessageValidation(
        "x".repeat(RECRUITER_USER_MESSAGE_MAX_CHARS + 3_896)
      )
    ).toEqual({
      characterCount: 12_088,
      charactersOverLimit: 3_896,
      isTooLong: true,
    });
  });

  it("counts trimmed input like the API guard", () => {
    expect(
      getRecruiterUserMessageValidation(
        `  ${"x".repeat(RECRUITER_USER_MESSAGE_MAX_CHARS)}  `
      )
    ).toEqual({
      characterCount: RECRUITER_USER_MESSAGE_MAX_CHARS,
      charactersOverLimit: 0,
      isTooLong: false,
    });
  });
});
