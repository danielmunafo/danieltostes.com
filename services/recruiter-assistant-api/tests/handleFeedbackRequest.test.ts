import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TEST_ORIGIN = "https://client.example";

vi.mock("../src/feedback/writeFeedbackToS3.js", () => ({
  writeFeedbackToS3: vi.fn(),
}));

vi.mock("../src/tracing/requestTraceMetrics.js", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../src/tracing/requestTraceMetrics.js")
    >();
  return {
    ...actual,
    emitFeedbackMetrics: vi.fn(),
  };
});

const { handleFeedbackRequest } =
  await import("../src/handleFeedbackRequest.js");
const { writeFeedbackToS3 } =
  await import("../src/feedback/writeFeedbackToS3.js");
const { emitFeedbackMetrics } =
  await import("../src/tracing/requestTraceMetrics.js");

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function feedbackEvent(body: Record<string, unknown>) {
  return {
    requestContext: { http: { method: "POST", sourceIp: "203.0.113.77" } },
    headers: { origin: TEST_ORIGIN },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  };
}

describe("handleFeedbackRequest", () => {
  const previousAllowedOrigin = process.env.ALLOWED_ORIGIN;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_ORIGIN = TEST_ORIGIN;
  });

  afterEach(() => {
    restoreEnv("ALLOWED_ORIGIN", previousAllowedOrigin);
  });

  it("stores accepted feedback and emits feedback metrics", async () => {
    const feedbackBody = {
      requestId: "req-123",
      messageId: "message-123",
      sessionId: "session-123",
      timestamp: "2026-06-27T15:00:00.000Z",
      questionHash: "abcdef01234567ab",
      responseHash: "0123456789abcdef",
      questionText: "We need a senior TypeScript engineer.",
      responseText: "Daniel is a strong fit based on...",
      rating: "negative",
      reason: "missing_context",
      comment: "The answer skipped the database constraint.",
      locale: "en",
      schemaVersion: "2",
    };

    const res = await handleFeedbackRequest(feedbackEvent(feedbackBody));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(writeFeedbackToS3).toHaveBeenCalledWith(feedbackBody);
    expect(emitFeedbackMetrics).toHaveBeenCalledWith(feedbackBody);
  });
});
