import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ModelCallTimeoutError,
  runReliableModelCall,
} from "../src/reliability/modelCallReliability.js";

function httpError(statusCode: number): Error & { statusCode: number } {
  return Object.assign(new Error(`HTTP ${statusCode}`), { statusCode });
}

function expectAbortSignal(value: AbortSignal | null): AbortSignal {
  expect(value).not.toBeNull();
  return value as AbortSignal;
}

describe("runReliableModelCall", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries a 429 after the configured backoff", async () => {
    vi.useFakeTimers();
    let attempts = 0;

    const result = runReliableModelCall(
      {
        label: "retrieval_embed",
        timeoutMs: 1_000,
        maxAttempts: 3,
        initialBackoffMs: 25,
        maxBackoffMs: 25,
        jitterRatio: 0,
        random: () => 0,
      },
      async () => {
        attempts += 1;
        if (attempts === 1) throw httpError(429);
        return "ok";
      }
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(attempts).toBe(1);

    await vi.advanceTimersByTimeAsync(24);
    expect(attempts).toBe(1);

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toBe("ok");
    expect(attempts).toBe(2);
  });

  it("does not retry a non-retryable provider error", async () => {
    const err = httpError(400);
    let attempts = 0;

    await expect(
      runReliableModelCall(
        {
          label: "hard_gates",
          timeoutMs: 1_000,
          maxAttempts: 3,
          initialBackoffMs: 0,
          maxBackoffMs: 0,
          jitterRatio: 0,
        },
        async () => {
          attempts += 1;
          throw err;
        }
      )
    ).rejects.toBe(err);

    expect(attempts).toBe(1);
  });

  it("times out a hung call and aborts the attempt signal", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    let attemptSignal: AbortSignal | null = null;
    let abortEvents = 0;

    const result = runReliableModelCall(
      {
        label: "references_embed",
        timeoutMs: 15,
        maxAttempts: 3,
        initialBackoffMs: 0,
        maxBackoffMs: 0,
        jitterRatio: 0,
      },
      async (signal) => {
        attempts += 1;
        attemptSignal = signal;
        signal.addEventListener("abort", () => {
          abortEvents += 1;
        });
        return new Promise<string>(() => {});
      }
    );

    await vi.advanceTimersByTimeAsync(0);
    expect(expectAbortSignal(attemptSignal).aborted).toBe(false);

    const rejection = result.catch((err: unknown) => err);
    await vi.advanceTimersByTimeAsync(15);
    const err = await rejection;
    expect(err).toBeInstanceOf(ModelCallTimeoutError);
    expect(err).toMatchObject({ timeoutMs: 15 });
    expect(attempts).toBe(1);
    expect(abortEvents).toBe(1);
  });

  it("propagates parent cancellation without retrying", async () => {
    const controller = new AbortController();
    const abortReason = new DOMException("client disconnected", "AbortError");
    let attempts = 0;
    let observedAbort = false;

    const result = runReliableModelCall(
      {
        label: "chart",
        timeoutMs: 1_000,
        maxAttempts: 3,
        initialBackoffMs: 0,
        maxBackoffMs: 0,
        jitterRatio: 0,
        signal: controller.signal,
      },
      async (signal) => {
        attempts += 1;
        signal.addEventListener("abort", () => {
          observedAbort = signal.aborted;
        });
        return new Promise<string>(() => {});
      }
    );

    await Promise.resolve();
    const rejection = result.catch((err: unknown) => err);
    controller.abort(abortReason);

    await expect(rejection).resolves.toBe(abortReason);
    expect(attempts).toBe(1);
    expect(observedAbort).toBe(true);
  });
});
