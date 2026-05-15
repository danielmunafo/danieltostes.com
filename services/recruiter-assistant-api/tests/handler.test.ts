import { describe, expect, it } from "vitest";
import { handleChatRequest } from "../src/handler.js";

describe("handleChatRequest", () => {
  it("returns 204 for OPTIONS", async () => {
    const res = await handleChatRequest({
      requestContext: { http: { method: "OPTIONS" } },
      headers: {},
    });
    expect(res.status).toBe(204);
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await handleChatRequest({
      requestContext: { http: { method: "POST", sourceIp: "127.0.0.1" } },
      headers: {},
      body: "{not-json",
      isBase64Encoded: false,
    });
    expect(res.status).toBe(400);
  });

  it("returns 403 when Origin is not allowed", async () => {
    const prev = process.env.ALLOWED_ORIGIN;
    process.env.ALLOWED_ORIGIN = "https://allowed.example";
    try {
      const res = await handleChatRequest({
        requestContext: { http: { method: "POST", sourceIp: "127.0.0.1" } },
        headers: { origin: "https://evil.example" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "hello" }],
        }),
        isBase64Encoded: false,
      });
      expect(res.status).toBe(403);
    } finally {
      if (prev === undefined) delete process.env.ALLOWED_ORIGIN;
      else process.env.ALLOWED_ORIGIN = prev;
    }
  });
});
