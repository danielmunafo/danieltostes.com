import {
  extractUsage,
  getActiveTrace,
  type ModelCallKind,
} from "../tracing/requestTrace.js";
import { buildStageSignal } from "./abortSignals.js";
import { classifyProviderError } from "./classifyError.js";
import { getCancellationSignal } from "./requestCancellation.js";
import { STAGE_POLICIES, type StageName, type StagePolicy } from "./policy.js";

/** Full-jitter exponential backoff bounds (shared by every wrapper-owned loop). */
const BACKOFF_BASE_MS = 250;
const BACKOFF_CAP_MS = 2_000;

function fullJitterBackoffMs(retryIndex: number): number {
  const ceiling = Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** retryIndex);
  return Math.floor(Math.random() * ceiling);
}

function errorNameOf(err: unknown): string {
  return err instanceof Error && err.name ? err.name : "UnknownError";
}

/** A delay that rejects with the abort reason if `signal` aborts first. */
function abortableDelay(
  ms: number,
  signal: AbortSignal | undefined
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const onAbort = (): void => {
      cleanup();
      reject(signal?.reason);
    };
    function cleanup(): void {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export type ReliabilityCallOptions = {
  abortSignal: AbortSignal;
  maxRetries: number;
};

/**
 * Runs one awaited model call (`generateObject` / `generateText` / `embedMany`)
 * under a stage policy: per-attempt timeout composed with request cancellation,
 * a retry loop with full-jitter backoff, and a single per-stage trace record
 * carrying reliability fields. The wrapper is the only retrier, so it tells the
 * SDK `maxRetries: 0`.
 */
export function runModelStage<T>(
  stage: StageName,
  kind: ModelCallKind,
  model: string,
  call: (options: ReliabilityCallOptions) => Promise<T>
): Promise<T> {
  return runWithPolicy(STAGE_POLICIES[stage], kind, model, call);
}

/** Policy-injected variant — exported for unit tests with custom budgets. */
export async function runWithPolicy<T>(
  policy: StagePolicy,
  kind: ModelCallKind,
  model: string,
  call: (options: ReliabilityCallOptions) => Promise<T>
): Promise<T> {
  const cancellation = getCancellationSignal();
  const startedAt = Date.now();

  for (let attempt = 1; ; attempt += 1) {
    const stageSignal = buildStageSignal(policy.timeoutMs, cancellation);
    try {
      const result = await call({
        abortSignal: stageSignal.signal,
        maxRetries: 0,
      });
      stageSignal.cleanup();
      getActiveTrace()?.recordStage({
        stage: policy.stage,
        model,
        kind,
        status: "success",
        latencyMs: Date.now() - startedAt,
        usage: extractUsage(result, kind),
        attempts: attempt,
        retried: attempt > 1,
      });
      return result;
    } catch (err) {
      stageSignal.cleanup();
      const cancelled = stageSignal.cancelled();
      const timedOut = !cancelled && stageSignal.timedOut();
      const classification = cancelled
        ? { errorClass: "cancelled" as const, retryable: false }
        : timedOut
          ? { errorClass: "timeout" as const, retryable: true }
          : classifyProviderError(err);

      const canRetry =
        classification.retryable &&
        attempt < policy.maxAttempts &&
        !cancellation?.aborted;

      if (!canRetry) {
        getActiveTrace()?.recordStage({
          stage: policy.stage,
          model,
          kind,
          status: "error",
          latencyMs: Date.now() - startedAt,
          attempts: attempt,
          retried: attempt > 1,
          timedOut,
          errorClass: classification.errorClass,
          errorName: errorNameOf(err),
        });
        throw err;
      }

      try {
        await abortableDelay(fullJitterBackoffMs(attempt - 1), cancellation);
      } catch (abortReason) {
        getActiveTrace()?.recordStage({
          stage: policy.stage,
          model,
          kind,
          status: "error",
          latencyMs: Date.now() - startedAt,
          attempts: attempt,
          retried: attempt > 1,
          errorClass: "cancelled",
          errorName: errorNameOf(err),
        });
        throw abortReason ?? err;
      }
    }
  }
}

export type StreamReliabilityOptions = {
  abortSignal: AbortSignal;
  maxRetries: number;
  onError: (event: { error: unknown }) => void;
  onFinish: (event: {
    usage: { promptTokens: number; completionTokens: number };
  }) => void;
};

/**
 * Wraps a streaming model call (`streamText`). The wrapper owns the timeout
 * (composed with cancellation, also guarding a stalled stream) and trace
 * recording via `onFinish`/`onError`; retries are SDK-internal and pre-first-
 * token only — there is no replay after bytes reach the client. Returns the
 * stream result unchanged so the caller still merges it and awaits `.text`.
 */
export function streamModelStage<R>(
  stage: StageName,
  model: string,
  start: (options: StreamReliabilityOptions) => R
): R {
  const policy = STAGE_POLICIES[stage];
  const cancellation = getCancellationSignal();
  const stageSignal = buildStageSignal(policy.timeoutMs, cancellation);
  const startedAt = Date.now();
  let recorded = false;

  const recordOnce = (build: () => void): void => {
    if (recorded) return;
    recorded = true;
    stageSignal.cleanup();
    build();
  };

  return start({
    abortSignal: stageSignal.signal,
    maxRetries: policy.mechanism === "sdk" ? policy.maxAttempts - 1 : 0,
    onFinish: ({ usage }) => {
      recordOnce(() => {
        getActiveTrace()?.recordStage({
          stage,
          model,
          kind: "chat",
          status: "success",
          latencyMs: Date.now() - startedAt,
          usage,
          attempts: 1,
        });
      });
    },
    onError: ({ error }) => {
      recordOnce(() => {
        const cancelled = stageSignal.cancelled();
        const timedOut = !cancelled && stageSignal.timedOut();
        const errorClass = cancelled
          ? "cancelled"
          : timedOut
            ? "timeout"
            : classifyProviderError(error).errorClass;
        getActiveTrace()?.recordStage({
          stage,
          model,
          kind: "chat",
          status: "error",
          latencyMs: Date.now() - startedAt,
          timedOut,
          errorClass,
          errorName: errorNameOf(error),
        });
      });
    },
  });
}
