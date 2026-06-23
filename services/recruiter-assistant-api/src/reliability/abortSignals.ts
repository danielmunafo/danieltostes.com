/**
 * Composes a per-stage timeout signal with an optional request-cancellation
 * signal into one `AbortSignal`, and reports which source fired. Implemented
 * with manual listeners (rather than `AbortSignal.any`) so the abort reason is
 * preserved and behavior is identical across Node 20.x patch versions.
 */

export type StageSignal = {
  /** Pass this to the model call's `abortSignal`. */
  readonly signal: AbortSignal;
  /** True when the per-stage timeout fired. */
  timedOut(): boolean;
  /** True when the request was cancelled (client disconnect / stop). */
  cancelled(): boolean;
  /** Clears the timer and detaches listeners. Always call once. */
  cleanup(): void;
};

type CombinedSignal = { signal: AbortSignal; cleanup(): void };

function combineSignals(sources: readonly AbortSignal[]): CombinedSignal {
  const controller = new AbortController();

  const detach = (): void => {
    for (const source of sources) {
      source.removeEventListener("abort", onAbort);
    }
  };

  function onAbort(event: Event): void {
    controller.abort((event.target as AbortSignal).reason);
    detach();
  }

  for (const source of sources) {
    if (source.aborted) {
      controller.abort(source.reason);
      return { signal: controller.signal, cleanup: detach };
    }
  }
  for (const source of sources) {
    source.addEventListener("abort", onAbort, { once: true });
  }
  return { signal: controller.signal, cleanup: detach };
}

/**
 * Builds the abort signal for one stage attempt: a fresh timeout plus the
 * (shared) request-cancellation signal when present.
 */
export function buildStageSignal(
  timeoutMs: number,
  cancellationSignal?: AbortSignal
): StageSignal {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(
      new DOMException(`stage timed out after ${timeoutMs}ms`, "TimeoutError")
    );
  }, timeoutMs);
  // Never keep the event loop alive solely for a stage timer.
  if (typeof (timer as { unref?: () => void }).unref === "function") {
    (timer as { unref: () => void }).unref();
  }

  const sources = cancellationSignal
    ? [timeoutController.signal, cancellationSignal]
    : [timeoutController.signal];
  const combined = combineSignals(sources);

  return {
    signal: combined.signal,
    timedOut: () => timeoutController.signal.aborted,
    cancelled: () => Boolean(cancellationSignal?.aborted),
    cleanup: () => {
      clearTimeout(timer);
      combined.cleanup();
    },
  };
}
