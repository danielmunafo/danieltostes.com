import { describe, expect, it } from "vitest";
import {
  estimateChatCostUSD,
  estimateCostUSD,
  estimateEmbeddingCostUSD,
} from "../src/tracing/costEstimator.js";

describe("estimateChatCostUSD", () => {
  it("prices prompt tokens at the input rate", () => {
    expect(
      estimateChatCostUSD("gpt-4.1-nano", {
        promptTokens: 1_000_000,
        completionTokens: 0,
      })
    ).toBeCloseTo(0.1, 10);
  });

  it("prices completion tokens at the output rate", () => {
    expect(
      estimateChatCostUSD("gpt-4.1-nano", {
        promptTokens: 0,
        completionTokens: 1_000_000,
      })
    ).toBeCloseTo(0.4, 10);
  });

  it("sums input and output cost", () => {
    expect(
      estimateChatCostUSD("gpt-4.1-nano", {
        promptTokens: 500_000,
        completionTokens: 250_000,
      })
    ).toBeCloseTo(0.05 + 0.1, 10);
  });

  it("returns null for an unknown model", () => {
    expect(
      estimateChatCostUSD("some-unconfigured-model", {
        promptTokens: 1000,
        completionTokens: 1000,
      })
    ).toBeNull();
  });

  it("treats non-finite or negative token counts as zero", () => {
    expect(
      estimateChatCostUSD("gpt-4.1-nano", {
        promptTokens: Number.NaN,
        completionTokens: -50,
      })
    ).toBe(0);
  });
});

describe("estimateEmbeddingCostUSD", () => {
  it("prices embedding tokens at the per-token rate", () => {
    expect(
      estimateEmbeddingCostUSD("text-embedding-3-small", {
        tokens: 1_000_000,
      })
    ).toBeCloseTo(0.02, 10);
  });

  it("returns null for an unknown embedding model", () => {
    expect(
      estimateEmbeddingCostUSD("unknown-embed", { tokens: 1000 })
    ).toBeNull();
  });
});

describe("estimateCostUSD dispatcher", () => {
  it("routes chat usage to the chat estimator", () => {
    expect(
      estimateCostUSD("gpt-4.1-nano", {
        promptTokens: 1_000_000,
        completionTokens: 0,
      })
    ).toBeCloseTo(0.1, 10);
  });

  it("routes embedding usage to the embedding estimator", () => {
    expect(
      estimateCostUSD("text-embedding-3-small", { tokens: 1_000_000 })
    ).toBeCloseTo(0.02, 10);
  });
});
