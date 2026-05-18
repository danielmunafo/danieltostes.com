import { describe, expect, it } from "vitest";
import { MAX_CHAT_HISTORY_JSON_CHARS } from "../src/constants.js";
import { parseAndValidateRecruiterRequest } from "../src/recruiterAssistant/request/parseAndValidateRecruiterRequest.js";

const validBody = {
  messages: [{ role: "user", content: "Senior backend engineer role" }],
};

describe("parseAndValidateRecruiterRequest", () => {
  it("returns 405 for non-POST methods", async () => {
    const result = await parseAndValidateRecruiterRequest({
      requestContext: { http: { method: "GET", sourceIp: "127.0.0.1" } },
      headers: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(405);
    }
  });

  it("returns 400 for invalid JSON", async () => {
    const result = await parseAndValidateRecruiterRequest({
      requestContext: { http: { method: "POST", sourceIp: "127.0.0.1" } },
      headers: {},
      body: "{not-json",
      isBase64Encoded: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it("returns 400 for invalid body schema", async () => {
    const result = await parseAndValidateRecruiterRequest({
      requestContext: { http: { method: "POST", sourceIp: "127.0.0.1" } },
      headers: {},
      body: JSON.stringify({ messages: "not-an-array" }),
      isBase64Encoded: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
    }
  });

  it("returns 413 when chat history exceeds max size", async () => {
    const hugeContent = "x".repeat(MAX_CHAT_HISTORY_JSON_CHARS);
    const result = await parseAndValidateRecruiterRequest({
      requestContext: { http: { method: "POST", sourceIp: "127.0.0.1" } },
      headers: {},
      body: JSON.stringify({
        messages: [{ role: "user", content: hugeContent }],
      }),
      isBase64Encoded: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(413);
    }
  });

  it("returns 403 captcha_failed when secret is set and token missing", async () => {
    const prev = process.env.RECAPTCHA_SECRET_KEY;
    process.env.RECAPTCHA_SECRET_KEY = "test-secret";
    try {
      const result = await parseAndValidateRecruiterRequest({
        requestContext: { http: { method: "POST", sourceIp: "127.0.0.1" } },
        headers: {},
        body: JSON.stringify(validBody),
        isBase64Encoded: false,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.response.status).toBe(403);
        const json = (await result.response.json()) as { error: string };
        expect(json.error).toBe("captcha_failed");
      }
    } finally {
      if (prev === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
      else process.env.RECAPTCHA_SECRET_KEY = prev;
    }
  });

  it("accepts valid request when captcha is not configured", async () => {
    const prevCaptcha = process.env.RECAPTCHA_SECRET_KEY;
    delete process.env.RECAPTCHA_SECRET_KEY;
    try {
      const result = await parseAndValidateRecruiterRequest({
        requestContext: { http: { method: "POST", sourceIp: "127.0.0.1" } },
        headers: {},
        body: JSON.stringify(validBody),
        isBase64Encoded: false,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.guardedText).toContain("Senior backend");
        expect(result.value.navLocale).toBe("en");
        expect(result.value.coreMessages.length).toBeGreaterThan(0);
      }
    } finally {
      if (prevCaptcha === undefined) delete process.env.RECAPTCHA_SECRET_KEY;
      else process.env.RECAPTCHA_SECRET_KEY = prevCaptcha;
    }
  });
});
