import { streamText } from "ai";
import { getActiveTrace, type ModelCallKind } from "../tracing/requestTrace.js";
import { ModelCallTimeoutError } from "./modelCallReliability.js";

const STREAM_TEXT_KIND: ModelCallKind = "chat";
const STREAM_TEXT_DEFAULT_MAX_RETRIES = 0;

export const STREAM_TEXT_STAGE_TIMEOUT_MS = 45_000;
export const STREAM_TEXT_REQUEST_TIMEOUT_MS = 55_000;

type StreamTextOptions = Parameters<typeof streamText>[0];
type StreamTextFinishEvent = Parameters<
  NonNullable<StreamTextOptions["onFinish"]>
>[0];
type StreamTextErrorEvent = Parameters<
  NonNullable<StreamTextOptions["onError"]>
>[0];

export type TraceStreamTextInput = Omit<
  StreamTextOptions,
  "abortSignal" | "maxRetries" | "onError" | "onFinish"
> & {
  readonly traceStage: string;
  readonly traceModel: string;
  readonly traceSignal?: AbortSignal;
  readonly traceTimeoutMs?: number;
  readonly onError?: StreamTextOptions["onError"];
  readonly onFinish?: StreamTextOptions["onFinish"];
};

export type TraceStreamTextResult = {
  readonly result: ReturnType<typeof streamText>;
  readonly text: Promise<string>;
};

export type StreamTextRequestScope = {
  readonly signal: AbortSignal;
  readonly cleanup: () => void;
};

type AbortScope = StreamTextRequestScope & {
  readonly abortPromise: Promise<never>;
};

export function createStreamTextRequestScope(
  timeoutMs = STREAM_TEXT_REQUEST_TIMEOUT_MS
): StreamTextRequestScope {
  const scope = createAbortScope("streaming_request", timeoutMs);
  scope.abortPromise.catch(() => {});
  return {
    signal: scope.signal,
    cleanup: scope.cleanup,
  };
}

export function traceStreamText(
  input: TraceStreamTextInput
): TraceStreamTextResult {
  const {
    traceStage,
    traceModel,
    traceSignal,
    traceTimeoutMs,
    onError,
    onFinish,
    ...streamOptions
  } = input;
  const trace = getActiveTrace();
  const startedAt = Date.now();
  const abortScope = createAbortScope(
    traceStage,
    traceTimeoutMs ?? STREAM_TEXT_STAGE_TIMEOUT_MS,
    traceSignal
  );
  let didRecordStage = false;

  const recordError = (err: unknown): void => {
    if (didRecordStage) return;
    didRecordStage = true;
    const normalizedError = normalizeStreamError(err, abortScope.signal);
    trace?.recordStage({
      stage: traceStage,
      model: traceModel,
      kind: STREAM_TEXT_KIND,
      status: "error",
      latencyMs: Date.now() - startedAt,
      errorName:
        normalizedError instanceof Error
          ? normalizedError.name
          : "UnknownError",
    });
  };

  const recordSuccess = (event: StreamTextFinishEvent): void => {
    if (didRecordStage) return;
    didRecordStage = true;
    const usage = extractStreamUsage(event);
    trace?.recordStage({
      stage: traceStage,
      model: traceModel,
      kind: STREAM_TEXT_KIND,
      status: "success",
      latencyMs: Date.now() - startedAt,
      usage,
    });
    abortScope.cleanup();
  };

  try {
    const result = streamText({
      ...streamOptions,
      abortSignal: abortScope.signal,
      maxRetries: STREAM_TEXT_DEFAULT_MAX_RETRIES,
      onError: async (event: StreamTextErrorEvent) => {
        recordError(event.error);
        await onError?.(event);
      },
      onFinish: async (event: StreamTextFinishEvent) => {
        await onFinish?.(event);
        recordSuccess(event);
      },
    });
    return {
      result,
      text: Promise.race([result.text, abortScope.abortPromise])
        .catch((err: unknown) => {
          recordError(err);
          throw err;
        })
        .finally(() => {
          abortScope.cleanup();
        }),
    };
  } catch (err) {
    recordError(err);
    abortScope.cleanup();
    throw err;
  }
}

function createAbortScope(
  label: string,
  timeoutMs: number,
  parentSignal?: AbortSignal
): AbortScope {
  const controller = new AbortController();
  let rejectAbortPromise: (err: unknown) => void = () => {};
  let didRejectAbortPromise = false;

  const abortPromise = new Promise<never>((_, reject) => {
    rejectAbortPromise = reject;
  });

  const abort = (reason: unknown): void => {
    const normalizedReason = normalizeAbortReason(reason, label);
    if (!controller.signal.aborted) {
      controller.abort(normalizedReason);
    }
    if (!didRejectAbortPromise) {
      didRejectAbortPromise = true;
      rejectAbortPromise(normalizedReason);
    }
  };

  const onParentAbort = (): void => {
    abort(abortReason(parentSignal, label));
  };

  if (parentSignal) {
    parentSignal.addEventListener("abort", onParentAbort, { once: true });
    if (parentSignal.aborted) onParentAbort();
  }

  const timeoutId = setTimeout(() => {
    abort(new ModelCallTimeoutError(label, timeoutMs));
  }, timeoutMs);

  return {
    signal: controller.signal,
    abortPromise,
    cleanup: () => {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener("abort", onParentAbort);
    },
  };
}

function extractStreamUsage(
  event: StreamTextFinishEvent
): { promptTokens: number; completionTokens: number } | undefined {
  const { usage } = event;
  if (
    typeof usage?.promptTokens !== "number" ||
    typeof usage.completionTokens !== "number" ||
    !Number.isFinite(usage.promptTokens) ||
    !Number.isFinite(usage.completionTokens)
  ) {
    return undefined;
  }
  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
  };
}

function normalizeStreamError(err: unknown, signal: AbortSignal): unknown {
  if (signal.aborted && signal.reason instanceof Error) {
    return signal.reason;
  }
  return err;
}

function abortReason(signal: AbortSignal | undefined, label: string): Error {
  if (signal?.reason instanceof Error) return signal.reason;
  if (typeof signal?.reason === "string" && signal.reason.trim().length > 0) {
    return new DOMException(signal.reason, "AbortError");
  }
  return new DOMException(`${label} cancelled`, "AbortError");
}

function normalizeAbortReason(reason: unknown, label: string): Error {
  if (reason instanceof Error) return reason;
  if (typeof reason === "string" && reason.trim().length > 0) {
    return new DOMException(reason, "AbortError");
  }
  return new DOMException(`${label} cancelled`, "AbortError");
}
