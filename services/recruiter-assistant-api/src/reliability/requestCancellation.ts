import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped cancellation. The handler creates an `AbortController` per
 * request and runs the pipeline inside `runWithCancellation(signal, …)`; the
 * reliability wrapper composes this signal into every model call so an abort
 * propagates to in-flight OpenAI requests and streams.
 *
 * Producer status: a client disconnect on the Lambda Function URL stream (and,
 * later, an explicit frontend stop control) should call `controller.abort(...)`
 * with {@link CLIENT_CANCEL_REASON}. The wiring is end-to-end; the trigger is
 * the only client/runtime-pending piece.
 */

/** Abort reason used for client-initiated cancellation (vs. a timeout). */
export const CLIENT_CANCEL_REASON = "client_cancelled";

const cancellationStore = new AsyncLocalStorage<AbortSignal>();

export function runWithCancellation<T>(
  signal: AbortSignal,
  fn: () => Promise<T>
): Promise<T> {
  return cancellationStore.run(signal, fn);
}

/** The cancellation signal for the current request, if any. */
export function getCancellationSignal(): AbortSignal | undefined {
  return cancellationStore.getStore();
}

/** True when the current request has been cancelled. */
export function isRequestCancelled(): boolean {
  return Boolean(cancellationStore.getStore()?.aborted);
}
