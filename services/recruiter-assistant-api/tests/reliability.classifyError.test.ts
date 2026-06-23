import { APICallError, NoObjectGeneratedError, RetryError } from "ai";
import { describe, expect, it } from "vitest";
import {
  classifyProviderError,
  unwrapError,
} from "../src/reliability/classifyError.js";

// ---------------------------------------------------------------------------
// unwrapError
// ---------------------------------------------------------------------------

describe("unwrapError", () => {
  it("returns the original error for non-RetryError values", () => {
    const err = new Error("plain");
    expect(unwrapError(err)).toBe(err);
  });

  it("returns lastError from a RetryError when present", () => {
    const last = new Error("last");
    const retry = new RetryError({
      message: "retry",
      reason: "maxRetriesExceeded",
      errors: [new Error("first"), last],
    });
    expect(unwrapError(retry)).toBe(last);
  });
});

// ---------------------------------------------------------------------------
// classifyProviderError — schema errors
// ---------------------------------------------------------------------------

describe("classifyProviderError — schema", () => {
  it("classifies NoObjectGeneratedError as schema / non-retryable", () => {
    const err = new NoObjectGeneratedError({
      message: "no object",
      text: "",
      response: { id: "", timestamp: new Date(), modelId: "", headers: {} },
      usage: { promptTokens: 0, completionTokens: 0 },
    });
    const result = classifyProviderError(err);
    expect(result).toEqual({ errorClass: "schema", retryable: false });
  });

  it("classifies ZodError by name as schema / non-retryable", () => {
    const err = Object.assign(new Error("zod"), { name: "ZodError" });
    expect(classifyProviderError(err)).toEqual({
      errorClass: "schema",
      retryable: false,
    });
  });
});

// ---------------------------------------------------------------------------
// classifyProviderError — APICallError
// ---------------------------------------------------------------------------

describe("classifyProviderError — APICallError", () => {
  function makeApiError(
    statusCode: number,
    isRetryable?: boolean
  ): APICallError {
    return new APICallError({
      message: `HTTP ${statusCode}`,
      url: "https://api.openai.com/v1/chat/completions",
      requestBodyValues: {},
      statusCode,
      responseBody: "",
      cause: undefined,
      isRetryable: isRetryable ?? (statusCode === 429 || statusCode >= 500),
      data: undefined,
    });
  }

  it("classifies 429 as retryable", () => {
    expect(classifyProviderError(makeApiError(429))).toEqual({
      errorClass: "retryable",
      retryable: true,
    });
  });

  it("classifies 500 as retryable", () => {
    expect(classifyProviderError(makeApiError(500))).toEqual({
      errorClass: "retryable",
      retryable: true,
    });
  });

  it("classifies 503 as retryable", () => {
    expect(classifyProviderError(makeApiError(503))).toEqual({
      errorClass: "retryable",
      retryable: true,
    });
  });

  it("classifies 401 as non-retryable", () => {
    expect(classifyProviderError(makeApiError(401, false))).toEqual({
      errorClass: "non_retryable",
      retryable: false,
    });
  });

  it("classifies 400 as non-retryable", () => {
    expect(classifyProviderError(makeApiError(400, false))).toEqual({
      errorClass: "non_retryable",
      retryable: false,
    });
  });

  it("uses isRetryable flag over status when true", () => {
    const err = makeApiError(400, true);
    expect(classifyProviderError(err)).toEqual({
      errorClass: "retryable",
      retryable: true,
    });
  });
});

// ---------------------------------------------------------------------------
// classifyProviderError — network codes
// ---------------------------------------------------------------------------

describe("classifyProviderError — network errors", () => {
  function makeNetworkError(code: string): Error {
    return Object.assign(new Error(code), { code });
  }

  it.each(["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EPIPE", "EAI_AGAIN"])(
    "classifies %s as retryable",
    (code) => {
      expect(classifyProviderError(makeNetworkError(code))).toEqual({
        errorClass: "retryable",
        retryable: true,
      });
    }
  );

  it("classifies 'fetch failed' message as retryable", () => {
    expect(classifyProviderError(new Error("fetch failed"))).toEqual({
      errorClass: "retryable",
      retryable: true,
    });
  });

  it("classifies 'socket hang up' message as retryable", () => {
    expect(classifyProviderError(new Error("socket hang up"))).toEqual({
      errorClass: "retryable",
      retryable: true,
    });
  });
});

// ---------------------------------------------------------------------------
// classifyProviderError — unknown / plain errors
// ---------------------------------------------------------------------------

describe("classifyProviderError — unknown shape", () => {
  it("classifies a plain Error as non-retryable (fail-fast)", () => {
    // This is the case in test mocks (vi.mock("ai") → new Error(...)).
    expect(
      classifyProviderError(new Error("structured output unavailable"))
    ).toEqual({
      errorClass: "non_retryable",
      retryable: false,
    });
  });

  it("classifies non-Error thrown values as non-retryable", () => {
    expect(classifyProviderError("string error")).toEqual({
      errorClass: "non_retryable",
      retryable: false,
    });
  });
});
