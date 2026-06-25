import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedbackBody } from "../src/feedback/feedbackSchema.js";
import { writeFeedbackToS3 } from "../src/feedback/writeFeedbackToS3.js";

const awsMocks = vi.hoisted(() => ({
  commands: [] as Array<Record<string, unknown>>,
  send: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: class {
    constructor(input: Record<string, unknown>) {
      awsMocks.commands.push(input);
    }
  },
  S3Client: class {
    send = awsMocks.send;
  },
}));

const record: FeedbackBody = {
  requestId: "trace/123",
  messageId: "message-456",
  sessionId: "session-xyz",
  timestamp: "2026-06-18T10:00:00.000Z",
  questionHash: "abcdef01234567ab",
  responseHash: "0123456789abcdef",
  rating: "negative",
  reason: "missing_context",
  comment: "Missing one must-have skill.",
  locale: "en",
  schemaVersion: "2",
};

describe("writeFeedbackToS3", () => {
  const previousBucket = process.env.FEEDBACK_S3_BUCKET;
  const previousPrefix = process.env.FEEDBACK_S3_PREFIX;

  beforeEach(() => {
    awsMocks.commands.length = 0;
    awsMocks.send.mockReset();
    awsMocks.send.mockResolvedValue({});
    process.env.FEEDBACK_S3_BUCKET = "feedback-bucket";
    process.env.FEEDBACK_S3_PREFIX = "custom";
  });

  afterEach(() => {
    if (previousBucket === undefined) delete process.env.FEEDBACK_S3_BUCKET;
    else process.env.FEEDBACK_S3_BUCKET = previousBucket;
    if (previousPrefix === undefined) delete process.env.FEEDBACK_S3_PREFIX;
    else process.env.FEEDBACK_S3_PREFIX = previousPrefix;
  });

  it("writes a hash-only feedback payload with trace and message join keys", async () => {
    await writeFeedbackToS3({
      ...record,
      questionText: "Senior TypeScript role",
      responseText: "Briefing body",
    } as FeedbackBody);

    expect(awsMocks.send).toHaveBeenCalledOnce();
    expect(awsMocks.commands).toHaveLength(1);
    const command = awsMocks.commands[0];
    expect(command).toMatchObject({
      Bucket: "feedback-bucket",
      Key: "custom/20260618_1781776800000_trace_123.json",
      ContentType: "application/json",
    });

    const body = JSON.parse(String(command?.Body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      requestId: "trace/123",
      messageId: "message-456",
      questionHash: "abcdef01234567ab",
      responseHash: "0123456789abcdef",
      rating: "negative",
      schemaVersion: "2",
    });
    expect(body).not.toHaveProperty("questionText");
    expect(body).not.toHaveProperty("responseText");
  });
});
