const ABORT_ERROR_NAME = "AbortError";

const RETRYABLE_HTTP_STATUS_CODES = new Set([408, 409, 425, 429]);

const RETRYABLE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_BODY_TIMEOUT",
]);

export const MODEL_CALL_DEFAULT_TIMEOUT_MS = 20_000;
export const MODEL_CALL_DEFAULT_MAX_ATTEMPTS = 3;
export const MODEL_CALL_DEFAULT_INITIAL_BACKOFF_MS = 250;
export const MODEL_CALL_DEFAULT_MAX_BACKOFF_MS = 2_000;
export const MODEL_CALL_DEFAULT_BACKOFF_MULTIPLIER = 2;
export const MODEL_CALL_DEFAULT_JITTER_RATIO = 0.25;

export type ModelCallRetryClassification =
  | "retryable"
  | "non_retryable"
  | "timeout"
  | "cancelled";

export type ReliableModelCallOptions = {
  readonly label: string;
  readonly timeoutMs?: number;
  readonly maxAttempts?: number;
  readonly initialBackoffMs?: number;
  readonly maxBackoffMs?: number;
  readonly backoffMultiplier?: number;
  readonly jitterRatio?: number;
  readonly random?: () => number;
  readonly signal?: AbortSignal;
};

export class ModelCallTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(label: string, timeoutMs: number) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = "ModelCallTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export async function runReliableModelCall<T>(
  options: ReliableModelCallOptions,
  operation: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const settings = normalizeOptions(options);

  for (let attempt = 1; attempt <= settings.maxAttempts; attempt += 1) {
    throwIfAborted(settings.signal, settings.label);

    const attemptScope = createAttemptScope(
      settings.label,
      settings.timeoutMs,
      settings.signal
    );
    let attemptError: unknown;

    try {
      return await Promise.race([
        Promise.resolve().then(() => operation(attemptScope.signal)),
        attemptScope.abortPromise,
      ]);
    } catch (err) {
      attemptError = normalizeAttemptError(err, attemptScope.signal);
    } finally {
      attemptScope.cleanup();
    }

    if (
      attempt >= settings.maxAttempts ||
      classifyModelCallError(attemptError) !== "retryable"
    ) {
      throw attemptError;
    }

    const backoffMs = calculateRetryBackoffMs({
      attemptIndex: attempt - 1,
      initialBackoffMs: settings.initialBackoffMs,
      maxBackoffMs: settings.maxBackoffMs,
      backoffMultiplier: settings.backoffMultiplier,
      jitterRatio: settings.jitterRatio,
      random: settings.random,
    });
    await sleepBeforeRetry(backoffMs, settings.signal, settings.label);
  }

  throw new Error(
    `${settings.label} failed before a model call attempt started`
  );
}

export function classifyModelCallError(
  err: unknown
): ModelCallRetryClassification {
  if (err instanceof ModelCallTimeoutError) return "timeout";
  if (isAbortLikeError(err)) return "cancelled";

  for (const item of errorChain(err)) {
    const statusCode =
      getNumberField(item, "statusCode") ?? getNumberField(item, "status");
    if (statusCode !== null) {
      if (RETRYABLE_HTTP_STATUS_CODES.has(statusCode) || statusCode >= 500) {
        return "retryable";
      }
      return "non_retryable";
    }

    const isRetryable = getBooleanField(item, "isRetryable");
    if (isRetryable !== null) {
      return isRetryable ? "retryable" : "non_retryable";
    }

    const errorCode = getStringField(item, "code");
    if (errorCode && RETRYABLE_ERROR_CODES.has(errorCode)) {
      return "retryable";
    }
  }

  return "non_retryable";
}

export function calculateRetryBackoffMs(params: {
  readonly attemptIndex: number;
  readonly initialBackoffMs: number;
  readonly maxBackoffMs: number;
  readonly backoffMultiplier: number;
  readonly jitterRatio: number;
  readonly random: () => number;
}): number {
  const exponentialMs =
    params.initialBackoffMs *
    params.backoffMultiplier ** Math.max(0, params.attemptIndex);
  const cappedMs = Math.min(params.maxBackoffMs, exponentialMs);
  const jitterWindowMs = cappedMs * params.jitterRatio;
  const jitterMs = jitterWindowMs * clampUnit(params.random());
  return Math.round(Math.min(params.maxBackoffMs, cappedMs + jitterMs));
}

function normalizeOptions(
  options: ReliableModelCallOptions
): Required<ReliableModelCallOptions> {
  return {
    label: options.label,
    timeoutMs: positiveIntegerOrDefault(
      options.timeoutMs,
      MODEL_CALL_DEFAULT_TIMEOUT_MS
    ),
    maxAttempts: positiveIntegerOrDefault(
      options.maxAttempts,
      MODEL_CALL_DEFAULT_MAX_ATTEMPTS
    ),
    initialBackoffMs: nonNegativeIntegerOrDefault(
      options.initialBackoffMs,
      MODEL_CALL_DEFAULT_INITIAL_BACKOFF_MS
    ),
    maxBackoffMs: nonNegativeIntegerOrDefault(
      options.maxBackoffMs,
      MODEL_CALL_DEFAULT_MAX_BACKOFF_MS
    ),
    backoffMultiplier: positiveNumberOrDefault(
      options.backoffMultiplier,
      MODEL_CALL_DEFAULT_BACKOFF_MULTIPLIER
    ),
    jitterRatio: nonNegativeNumberOrDefault(
      options.jitterRatio,
      MODEL_CALL_DEFAULT_JITTER_RATIO
    ),
    random: options.random ?? Math.random,
    signal: options.signal ?? new AbortController().signal,
  };
}

function positiveIntegerOrDefault(
  value: number | undefined,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.floor(value);
}

function nonNegativeIntegerOrDefault(
  value: number | undefined,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return Math.floor(value);
}

function positiveNumberOrDefault(
  value: number | undefined,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function nonNegativeNumberOrDefault(
  value: number | undefined,
  fallback: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function createAttemptScope(
  label: string,
  timeoutMs: number,
  parentSignal: AbortSignal
): {
  readonly signal: AbortSignal;
  readonly abortPromise: Promise<never>;
  readonly cleanup: () => void;
} {
  const controller = new AbortController();
  let rejectAbortPromise: (err: unknown) => void = () => {};

  const abortPromise = new Promise<never>((_, reject) => {
    rejectAbortPromise = reject;
  });

  const abortAttempt = (reason: unknown) => {
    if (!controller.signal.aborted) {
      controller.abort(reason);
    }
    rejectAbortPromise(reason);
  };

  const onParentAbort = () => abortAttempt(abortReason(parentSignal, label));
  parentSignal.addEventListener("abort", onParentAbort, { once: true });
  if (parentSignal.aborted) onParentAbort();

  const timeoutId = setTimeout(() => {
    abortAttempt(new ModelCallTimeoutError(label, timeoutMs));
  }, timeoutMs);

  return {
    signal: controller.signal,
    abortPromise,
    cleanup: () => {
      clearTimeout(timeoutId);
      parentSignal.removeEventListener("abort", onParentAbort);
    },
  };
}

function normalizeAttemptError(
  err: unknown,
  attemptSignal: AbortSignal
): unknown {
  if (
    attemptSignal.aborted &&
    attemptSignal.reason instanceof ModelCallTimeoutError
  ) {
    return attemptSignal.reason;
  }
  return err;
}

function throwIfAborted(signal: AbortSignal, label: string): void {
  if (signal.aborted) {
    throw abortReason(signal, label);
  }
}

function abortReason(signal: AbortSignal, label: string): Error {
  if (signal.reason instanceof Error) return signal.reason;
  if (typeof signal.reason === "string" && signal.reason.trim().length > 0) {
    return new DOMException(signal.reason, ABORT_ERROR_NAME);
  }
  return new DOMException(`${label} cancelled`, ABORT_ERROR_NAME);
}

function sleepBeforeRetry(
  delayMs: number,
  signal: AbortSignal,
  label: string
): Promise<void> {
  throwIfAborted(signal, label);
  if (delayMs <= 0) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);

    const onAbort = () => {
      clearTimeout(timeoutId);
      signal.removeEventListener("abort", onAbort);
      reject(abortReason(signal, label));
    };

    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
  });
}

function isAbortLikeError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === ABORT_ERROR_NAME) ||
    getStringField(err, "name") === ABORT_ERROR_NAME
  );
}

function* errorChain(err: unknown): Generator<unknown> {
  const seen = new Set<unknown>();
  let current: unknown = err;
  for (let depth = 0; depth < 5; depth += 1) {
    if (current === null || current === undefined || seen.has(current)) return;
    seen.add(current);
    yield current;
    if (typeof current !== "object" || !("cause" in current)) return;
    current = (current as { cause?: unknown }).cause;
  }
}

function getNumberField(err: unknown, key: string): number | null {
  if (typeof err !== "object" || err === null || !(key in err)) return null;
  const value = (err as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getBooleanField(err: unknown, key: string): boolean | null {
  if (typeof err !== "object" || err === null || !(key in err)) return null;
  const value = (err as Record<string, unknown>)[key];
  return typeof value === "boolean" ? value : null;
}

function getStringField(err: unknown, key: string): string | null {
  if (typeof err !== "object" || err === null || !(key in err)) return null;
  const value = (err as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}
