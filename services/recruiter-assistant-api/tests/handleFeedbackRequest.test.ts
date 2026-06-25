import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitForTests } from "../src/security/rateLimit.js";
import type { LambdaHttpEvent } from "../src/http/lambdaHttpEvent.js";
import { writeFeedbackToS3 } from "../src/feedback/writeFeedbackToS3.js";
import { handleFeedbackRequest } from "../src/handleFeedbackRequest.js";

vi.mock("../src/feedback/writeFeedbackToS3.js", () => ({
  writeFeedbackToS3: vi.fn(),
}));

const validFeedbackBody = {
  requestId: "trace-123",
  messageId: "message-456",
  sessionId: "session-xyz",
  timestamp: "2026-06-18T10:00:00.000Z",
  questionHash: "abcdef01234567ab",
  responseHash: "0123456789abcdef",
  rating: "positive" as const,
  locale: "en",
  schemaVersion: "2" as const,
};

function feedbackEvent(body: unknown): LambdaHttpEvent {
  return {
    requestContext: {
      http: { method: "POST", sourceIp: "198.51.100.42" },
    },
    headers: {},
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}

describe("handleFeedbackRequest", () => {
  beforeEach(() => {
    resetRateLimitForTests();
    vi.mocked(writeFeedbackToS3).mockReset();
    vi.mocked(writeFeedbackToS3).mockResolvedValue(undefined);
  });

  it("persists hash-only feedback while preserving join ids", async () => {
    const res = await handleFeedbackRequest(feedbackEvent(validFeedbackBody));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(writeFeedbackToS3).toHaveBeenCalledOnce();
    expect(writeFeedbackToS3).toHaveBeenCalledWith(validFeedbackBody);
  });

  it("rejects feedback bodies that include raw question or response text", async () => {
    const res = await handleFeedbackRequest(
      feedbackEvent({
        ...validFeedbackBody,
        questionText: "Senior TypeScript role",
        responseText: "Briefing body",
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid_body" });
    expect(writeFeedbackToS3).not.toHaveBeenCalled();
  });
});
