import { APICallError, NoObjectGeneratedError, RetryError } from "ai";

/**
 * Reliability error taxonomy. `timeout` and `cancelled` are decided by the
 * wrapper from the abort signals; `classifyProviderError` returns the rest.
 */
export type StageErrorClass =
  | "timeout"
  | "cancelled"
  | "retryable"
  | "non_retryable"
  | "schema";

export type ErrorClassification = {
  errorClass: StageErrorClass;
  retryable: boolean;
};

/** Transient HTTP statuses worth retrying (besides any 5xx). */
const RETRYABLE_STATUS_CODES = new Set([408, 409, 429]);

/** Node/undici network error codes that usually clear on retry. */
const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
  "ENOTFOUND",
]);

function isInstanceOf(
  guard: { isInstance?: (err: unknown) => boolean },
  ctor: new (...args: never[]) => unknown,
  err: unknown
): boolean {
  if (typeof guard.isInstance === "function") return guard.isInstance(err);
  return err instanceof ctor;
}

/** Unwraps the AI SDK `RetryError` to the underlying last error, if present. */
export function unwrapError(err: unknown): unknown {
  if (isInstanceOf(RetryError, RetryError, err)) {
    const retryError = err as RetryError;
    if (retryError.lastError !== undefined) return retryError.lastError;
    const errors = retryError.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors[errors.length - 1];
    }
  }
  return err;
}

function isSchemaError(err: unknown): boolean {
  if (isInstanceOf(NoObjectGeneratedError, NoObjectGeneratedError, err)) {
    return true;
  }
  const name = err instanceof Error ? err.name : "";
  return name === "ZodError" || name === "TypeValidationError";
}

function readNetworkCode(err: unknown): string | undefined {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : undefined;
}

/**
 * Classifies a provider/network error as retryable or not. Abort-driven cases
 * (timeout, cancellation) are handled by the wrapper, not here.
 */
export function classifyProviderError(err: unknown): ErrorClassification {
  const root = unwrapError(err);

  // Schema / no-object failures are not transient: a blind replay rarely helps.
  if (isSchemaError(root)) {
    return { errorClass: "schema", retryable: false };
  }

  if (isInstanceOf(APICallError, APICallError, root)) {
    const apiError = root as APICallError;
    if (apiError.isRetryable === true) {
      return { errorClass: "retryable", retryable: true };
    }
    const status = apiError.statusCode;
    if (
      typeof status === "number" &&
      (RETRYABLE_STATUS_CODES.has(status) || status >= 500)
    ) {
      return { errorClass: "retryable", retryable: true };
    }
    return { errorClass: "non_retryable", retryable: false };
  }

  const networkCode = readNetworkCode(root);
  if (networkCode && RETRYABLE_NETWORK_CODES.has(networkCode)) {
    return { errorClass: "retryable", retryable: true };
  }

  const message = root instanceof Error ? root.message.toLowerCase() : "";
  if (
    message.includes("fetch failed") ||
    message.includes("socket hang up") ||
    message.includes("network error") ||
    message.includes("terminated")
  ) {
    return { errorClass: "retryable", retryable: true };
  }

  // Unknown shape (e.g. mocked plain Error): fail fast rather than hammer.
  return { errorClass: "non_retryable", retryable: false };
}
