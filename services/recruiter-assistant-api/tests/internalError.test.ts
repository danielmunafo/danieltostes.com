import { describe, expect, it } from "vitest";
import { handleChatRequest } from "../src/handler.js";
import { resetOpenAiKeyCacheForTests } from "../src/secrets/openaiKey.js";

describe("internal error responses", () => {
  it("returns sanitized 500 when OpenAI credentials are missing", async () => {
    const prevKey = process.env.OPENAI_API_KEY;
    const prevArn = process.env.OPENAI_SECRET_ARN;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_SECRET_ARN;
    resetOpenAiKeyCacheForTests();

    try {
      const res = await handleChatRequest({
        requestContext: { http: { method: "POST", sourceIp: "127.0.0.1" } },
        headers: {},
        body: JSON.stringify({
          messages: [{ role: "user", content: "Senior backend engineer role" }],
        }),
        isBase64Encoded: false,
      });

      expect(res.status).toBe(500);
      const body = (await res.json()) as Record<string, unknown>;
      expect(body).toEqual({ error: "internal" });
      expect(body).not.toHaveProperty("message");
    } finally {
      resetOpenAiKeyCacheForTests();
      if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = prevKey;
      if (prevArn === undefined) delete process.env.OPENAI_SECRET_ARN;
      else process.env.OPENAI_SECRET_ARN = prevArn;
    }
  });
});
