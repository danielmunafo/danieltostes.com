import { describe, expect, it } from "vitest";
import { feedbackBodySchema } from "../src/feedback/feedbackSchema.js";

const valid = {
  requestId: "abc-123",
  sessionId: "session-xyz",
  timestamp: "2026-06-18T10:00:00.000Z",
  questionHash: "abcdef01234567ab",
  responseHash: "0123456789abcdef",
  rating: "positive" as const,
  locale: "en",
  schemaVersion: "1" as const,
};

describe("feedbackBodySchema", () => {
  it("accepts a valid positive record", () => {
    expect(feedbackBodySchema.safeParse(valid).success).toBe(true);
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
    const { rating: _r, ...rest } = valid;
    expect(feedbackBodySchema.safeParse(rest).success).toBe(false);
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
      feedbackBodySchema.safeParse({ ...valid, schemaVersion: "2" }).success
    ).toBe(false);
  });

  it("rejects missing timestamp", () => {
    const { timestamp: _t, ...rest } = valid;
    expect(feedbackBodySchema.safeParse(rest).success).toBe(false);
  });
});
