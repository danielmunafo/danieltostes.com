import { describe, expect, it } from "vitest";
import { feedbackBodySchema } from "../src/feedback/feedbackSchema.js";

const valid = {
  requestId: "abc-123",
  messageId: "message-123",
  sessionId: "session-xyz",
  timestamp: "2026-06-18T10:00:00.000Z",
  questionHash: "abcdef01234567ab",
  responseHash: "0123456789abcdef",
  questionText: "We are looking for a senior TypeScript engineer.",
  responseText: "Daniel is a strong fit based on his work at ...",
  rating: "positive" as const,
  locale: "en",
  schemaVersion: "2" as const,
};

describe("feedbackBodySchema", () => {
  it("accepts a valid positive record", () => {
    expect(feedbackBodySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts records without the optional UI message id", () => {
    const recordWithoutMessageId: Record<string, unknown> = { ...valid };
    delete recordWithoutMessageId.messageId;
    expect(feedbackBodySchema.safeParse(recordWithoutMessageId).success).toBe(
      true
    );
  });

  it("accepts a valid negative record with reason and comment", () => {
    const result = feedbackBodySchema.safeParse({
      ...valid,
      rating: "negative",
      reason: "wrong_fit",
      comment: "The role required Java but this is TypeScript.",
    });
    expect(result.success).toBe(true);
  });

  it("accepts negative with no reason (skip path)", () => {
    expect(
      feedbackBodySchema.safeParse({ ...valid, rating: "negative" }).success
    ).toBe(true);
  });

  it("rejects missing rating", () => {
    const recordWithoutRating: Record<string, unknown> = { ...valid };
    delete recordWithoutRating.rating;
    expect(feedbackBodySchema.safeParse(recordWithoutRating).success).toBe(
      false
    );
  });

  it("rejects empty UI message ids", () => {
    expect(
      feedbackBodySchema.safeParse({ ...valid, messageId: "" }).success
    ).toBe(false);
  });

  it("rejects invalid reason enum", () => {
    expect(
      feedbackBodySchema.safeParse({
        ...valid,
        rating: "negative",
        reason: "bad_vibes",
      }).success
    ).toBe(false);
  });

  it("rejects comment over 200 chars", () => {
    expect(
      feedbackBodySchema.safeParse({ ...valid, comment: "a".repeat(201) })
        .success
    ).toBe(false);
  });

  it("rejects questionHash shorter than 16 chars", () => {
    expect(
      feedbackBodySchema.safeParse({ ...valid, questionHash: "abc" }).success
    ).toBe(false);
  });

  it("rejects questionHash longer than 16 chars", () => {
    expect(
      feedbackBodySchema.safeParse({
        ...valid,
        questionHash: "abcdef0123456789x",
      }).success
    ).toBe(false);
  });

  it("rejects wrong schemaVersion", () => {
    expect(
      feedbackBodySchema.safeParse({ ...valid, schemaVersion: "1" }).success
    ).toBe(false);
  });

  it("rejects missing timestamp", () => {
    const recordWithoutTimestamp: Record<string, unknown> = { ...valid };
    delete recordWithoutTimestamp.timestamp;
    expect(feedbackBodySchema.safeParse(recordWithoutTimestamp).success).toBe(
      false
    );
  });

  it("rejects missing questionText", () => {
    const recordWithoutQuestionText: Record<string, unknown> = { ...valid };
    delete recordWithoutQuestionText.questionText;
    expect(
      feedbackBodySchema.safeParse(recordWithoutQuestionText).success
    ).toBe(false);
  });

  it("rejects questionText over 12000 chars", () => {
    expect(
      feedbackBodySchema.safeParse({
        ...valid,
        questionText: "a".repeat(12001),
      }).success
    ).toBe(false);
  });
});
