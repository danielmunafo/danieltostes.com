import { describe, expect, it } from "vitest";
import {
  buildFeedbackReviewReport,
  formatFeedbackReviewOutput,
} from "../scripts/lib/feedback-review-queue.mjs";

const negativeFeedback = {
  requestId: "req-negative",
  messageId: "message-1",
  sessionId: "session-1",
  timestamp: "2026-06-25T12:00:00.000Z",
  questionHash: "abcdef01234567ab",
  responseHash: "0123456789abcdef",
  questionText: "Private recruiter question text",
  responseText: "Private assistant answer text",
  rating: "negative",
  reason: "wrong_fit",
  comment: "The answer overstated Golang experience.",
  locale: "en",
  schemaVersion: "2",
};

const positiveFeedback = {
  ...negativeFeedback,
  requestId: "req-positive",
  rating: "positive",
  reason: undefined,
  comment: undefined,
};

const matchingTrace = {
  requestId: "req-negative",
  navLocale: "en",
  outcome: "success",
  totalLatencyMs: 1234,
  retrieval: {
    provider: "llamaindex-native",
    topK: 30,
    returnedChunks: 28,
    similarityMin: 0.31,
    similarityMax: 0.74,
    latencyMs: 180,
  },
  stages: [
    {
      stage: "pitch",
      model: "gpt-4.1-nano",
      status: "success",
      latencyMs: 220,
      promptId: "pitch",
      promptVersion: "1.0.1",
    },
    {
      stage: "chart",
      model: "gpt-4.1-nano",
      status: "error",
      latencyMs: 80,
      errorName: "APICallError",
      promptId: "chart",
      promptVersion: "1.0.0",
    },
  ],
};

describe("feedback review queue", () => {
  it("filters to negative feedback and joins by requestId", () => {
    const report = buildFeedbackReviewReport({
      feedbackRecords: [positiveFeedback, negativeFeedback],
      traceRecords: [matchingTrace],
      generatedAt: "2026-06-26T00:00:00.000Z",
    });

    expect(report.summary).toMatchObject({
      feedbackRecords: 2,
      traceRecords: 1,
      negativeFeedbackRecords: 1,
      joinedRecords: 1,
      missingTraceRecords: 0,
    });
    expect(report.items).toHaveLength(1);
    expect(report.items[0]).toMatchObject({
      requestId: "req-negative",
      feedback: {
        reason: "wrong_fit",
        comment: "The answer overstated Golang experience.",
        hashes: {
          questionHash: "abcdef01234567ab",
          responseHash: "0123456789abcdef",
        },
      },
      trace: {
        found: true,
        locale: "en",
        outcome: "success",
        retrieval: {
          provider: "llamaindex-native",
          returnedChunks: 28,
        },
      },
    });
    expect(report.items[0]?.trace.stages).toEqual([
      {
        stage: "pitch",
        status: "success",
        promptId: "pitch",
        promptVersion: "1.0.1",
        model: "gpt-4.1-nano",
        latencyMs: 220,
      },
      {
        stage: "chart",
        status: "error",
        errorName: "APICallError",
        promptId: "chart",
        promptVersion: "1.0.0",
        model: "gpt-4.1-nano",
        latencyMs: 80,
      },
    ]);
  });

  it("redacts raw question and response text by default", () => {
    const report = buildFeedbackReviewReport({
      feedbackRecords: [negativeFeedback],
      traceRecords: [matchingTrace],
    });

    const serialized = JSON.stringify(report.items[0]);
    expect(serialized).not.toContain("Private recruiter question text");
    expect(serialized).not.toContain("Private assistant answer text");
    expect(report.items[0]?.feedback.text).toMatchObject({
      redacted: true,
    });
  });

  it("includes raw question and response text only when requested", () => {
    const report = buildFeedbackReviewReport({
      feedbackRecords: [negativeFeedback],
      traceRecords: [matchingTrace],
      includeText: true,
    });

    expect(report.items[0]?.feedback.text).toEqual({
      questionText: "Private recruiter question text",
      responseText: "Private assistant answer text",
    });
  });

  it("keeps negative feedback without a matching trace reviewable", () => {
    const report = buildFeedbackReviewReport({
      feedbackRecords: [negativeFeedback],
      traceRecords: [],
    });

    expect(report.summary).toMatchObject({
      joinedRecords: 0,
      missingTraceRecords: 1,
    });
    expect(report.items[0]?.trace).toEqual({ found: false });
  });

  it("can emit eval-candidate JSON with target paths", () => {
    const report = buildFeedbackReviewReport({
      feedbackRecords: [negativeFeedback],
      traceRecords: [matchingTrace],
    });
    const candidates = formatFeedbackReviewOutput(report, "eval-candidates");

    expect(candidates.candidates).toHaveLength(1);
    expect(candidates.candidates[0]?.evalTargets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evalPath: "evals/hard-gates/cases.json",
        }),
        expect.objectContaining({
          evalPath: "evals/e2e/cases.json",
        }),
      ])
    );
  });
});
