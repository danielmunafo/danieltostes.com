import { APICallError } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  runWithPolicy,
  type ReliabilityCallOptions,
} from "../src/reliability/withReliability.js";
import type { StagePolicy } from "../src/reliability/policy.js";
import { RequestTrace, runWithTrace } from "../src/tracing/requestTrace.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePolicy(overrides?: Partial<StagePolicy>): StagePolicy {
  return {
    stage: "references_claims",
    timeoutMs: 5_000,
    maxAttempts: 3,
    mechanism: "wrapper",
    ...overrides,
  };
}

function make429(): APICallError {
  return new APICallError({
    message: "rate limited",
    url: "https://api.openai.com/v1",
    requestBodyValues: {},
    statusCode: 429,
    responseBody: "",
    cause: undefined,
    isRetryable: true,
    data: undefined,
  });
}

function make401(): APICallError {
  return new APICallError({
    message: "unauthorized",
    url: "https://api.openai.com/v1",
    requestBodyValues: {},
    statusCode: 401,
    responseBody: "",
    cause: undefined,
    isRetryable: false,
    data: undefined,
  });
}

function newTrace(): RequestTrace {
  return new RequestTrace("req-test", { navLocale: "en", nowMs: 0 });
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe("runWithPolicy — success", () => {
  it("resolves immediately on first attempt", async () => {
    const call = vi.fn().mockResolvedValue({ value: 42 });
    const result = await runWithPolicy(makePolicy(), "chat", "gpt-4", call);
    expect(result).toEqual({ value: 42 });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("passes a valid AbortSignal and maxRetries: 0 to the call", async () => {
    let opts: ReliabilityCallOptions | undefined;
    await runWithPolicy(makePolicy(), "chat", "gpt-4", (o) => {
      opts = o;
      return Promise.resolve("ok");
    });
    expect(opts!.abortSignal).toBeInstanceOf(AbortSignal);
    expect(opts!.maxRetries).toBe(0);
  });

  it("records a success stage in the active trace", async () => {
    const trace = newTrace();
    await runWithTrace(trace, () =>
      runWithPolicy(makePolicy(), "chat", "gpt-4", () => Promise.resolve("ok"))
    );
    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages).toHaveLength(1);
    expect(stages[0]).toMatchObject({
      stage: "references_claims",
      status: "success",
      attempts: 1,
    });
    // retried is only stored when true; on first-attempt success it is absent
    expect(stages[0]).not.toHaveProperty("retried");
  });
});

// ---------------------------------------------------------------------------
// Retry on 429
// ---------------------------------------------------------------------------

describe("runWithPolicy — retry on 429", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries up to maxAttempts and succeeds on last attempt", async () => {
    const err429 = make429();
    const call = vi
      .fn()
      .mockRejectedValueOnce(err429)
      .mockRejectedValueOnce(err429)
      .mockResolvedValue("final");

    // Advance timers so backoff delays resolve
    const promise = runWithPolicy(makePolicy(), "chat", "gpt-4", call);
    // Drain microtasks + advance through both backoff delays
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("final");
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("records retried: true and attempts: 2 when first attempt fails", async () => {
    const trace = newTrace();
    const call = vi
      .fn()
      .mockRejectedValueOnce(make429())
      .mockResolvedValue("ok");

    const promise = runWithTrace(trace, () =>
      runWithPolicy(makePolicy(), "chat", "gpt-4", call)
    );
    await vi.runAllTimersAsync();
    await promise;

    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages[0]).toMatchObject({ retried: true, attempts: 2 });
  });

  it("stops after maxAttempts and re-throws the last error", async () => {
    const err429 = make429();
    const call = vi.fn().mockRejectedValue(err429);

    const promise = runWithPolicy(
      makePolicy({ maxAttempts: 2 }),
      "chat",
      "gpt-4",
      call
    );
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toBe(err429);
    expect(call).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Non-retryable error (401)
// ---------------------------------------------------------------------------

describe("runWithPolicy — non-retryable", () => {
  it("throws immediately without retrying on 401", async () => {
    const err = make401();
    const call = vi.fn().mockRejectedValue(err);

    await expect(
      runWithPolicy(makePolicy(), "chat", "gpt-4", call)
    ).rejects.toBe(err);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("records errorClass: non_retryable in trace", async () => {
    const trace = newTrace();
    const call = vi.fn().mockRejectedValue(make401());

    await runWithTrace(trace, async () => {
      await runWithPolicy(makePolicy(), "chat", "gpt-4", call).catch(() => {});
    });

    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages[0]).toMatchObject({
      status: "error",
      errorClass: "non_retryable",
      attempts: 1,
    });
  });

  it("does not retry a plain Error (covers test-mock pattern)", async () => {
    const err = new Error("structured output unavailable");
    const call = vi.fn().mockRejectedValue(err);

    await expect(
      runWithPolicy(makePolicy(), "chat", "gpt-4", call)
    ).rejects.toBe(err);
    expect(call).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Timeout
// ---------------------------------------------------------------------------

describe("runWithPolicy — timeout", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("aborts the stage signal when the per-stage timeout fires", async () => {
    let capturedSignal: AbortSignal | undefined;
    // The mock must react to the abort signal, just like real fetch/openai clients.
    const call = vi
      .fn()
      .mockImplementation(({ abortSignal }: ReliabilityCallOptions) => {
        capturedSignal = abortSignal;
        return new Promise<never>((_, reject) => {
          abortSignal.addEventListener(
            "abort",
            () => reject(new DOMException("aborted", "AbortError")),
            { once: true }
          );
        });
      });

    const policy = makePolicy({ timeoutMs: 100, maxAttempts: 1 });
    const promise = runWithPolicy(policy, "chat", "gpt-4", call);

    // Firing the fake timer aborts the signal → the mock promise rejects.
    await vi.advanceTimersByTimeAsync(200);

    expect(capturedSignal?.aborted).toBe(true);
    await expect(promise).rejects.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

describe("runWithPolicy — cancellation", () => {
  it("does not retry when the request cancellation signal is already aborted", async () => {
    const { runWithCancellation } =
      await import("../src/reliability/requestCancellation.js");
    const controller = new AbortController();
    controller.abort("client_cancelled");

    const err = make429();
    const call = vi.fn().mockRejectedValue(err);

    await runWithCancellation(controller.signal, async () => {
      await expect(
        runWithPolicy(makePolicy(), "chat", "gpt-4", call)
      ).rejects.toBeDefined();
    });

    // Should not retry even though 429 is retryable, because request is cancelled
    expect(call).toHaveBeenCalledTimes(1);
  });
});
