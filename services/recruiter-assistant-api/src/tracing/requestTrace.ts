import { AsyncLocalStorage } from "node:async_hooks";
import { logInfo } from "../logging/logger.js";
import { findPromptByStage } from "../recruiterAssistant/prompt/promptRegistry.js";
import {
  estimateChatCostUSD,
  estimateEmbeddingCostUSD,
  type AnyTokenUsage,
} from "./costEstimator.js";
import { emitRequestTraceMetrics } from "./requestTraceMetrics.js";

export type StageStatus = "success" | "error";
export type ModelCallKind = "chat" | "embedding";
export type RequestOutcome = "success" | "error" | "unknown";

/** One model call within a request (LLM or embedding). */
export type StageRecord = {
  stage: string;
  model: string;
  status: StageStatus;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  tokens?: number;
  costUSD?: number;
  errorName?: string;
  promptId?: string;
  promptVersion?: string;
};

export type RetrievalStats = {
  provider: string;
  topK: number;
  returnedChunks: number;
  similarityMin: number | null;
  similarityMax: number | null;
  latencyMs: number;
};

export type RecordStageInput = {
  stage: string;
  model: string;
  kind: ModelCallKind;
  status: StageStatus;
  latencyMs: number;
  usage?: AnyTokenUsage;
  errorName?: string;
};

export type RequestTraceTotals = {
  llmCalls: number;
  promptTokens: number;
  completionTokens: number;
  embeddingTokens: number;
  totalTokens: number;
  estimatedCostUSD: number | null;
};

export type RequestTraceLogEnvelope = {
  requestId: string;
  navLocale: string;
  outcome: RequestOutcome;
  errorName?: string;
  totalLatencyMs: number;
  retrieval: RetrievalStats | null;
  stages: StageRecord[];
  totals: RequestTraceTotals;
};

function errorNameOf(err: unknown): string {
  if (err instanceof Error && err.name) return err.name;
  return "UnknownError";
}

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function finiteOrUndefined(value: number): number | undefined {
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Accumulates per-stage timing, token usage, estimated cost, and retrieval stats
 * for a single chat request. Emitted once, at request end, as a structured pino
 * log. Stage recording is a no-op after `finish()` so late (not-awaited) calls
 * cannot mutate an already-logged trace.
 */
export class RequestTrace {
  readonly requestId: string;
  private readonly navLocale: string;
  private readonly startedAtMs: number;
  private finishedAtMs: number | null = null;
  private finished = false;
  private outcome: RequestOutcome = "unknown";
  private errorName: string | undefined;
  private readonly stages: StageRecord[] = [];
  private retrieval: RetrievalStats | null = null;

  constructor(
    requestId: string,
    params: { navLocale: string; nowMs?: number }
  ) {
    this.requestId = requestId;
    this.navLocale = params.navLocale;
    this.startedAtMs = params.nowMs ?? Date.now();
  }

  recordStage(input: RecordStageInput): void {
    if (this.finished) return;
    const record: StageRecord = {
      stage: input.stage,
      model: input.model,
      status: input.status,
      latencyMs: input.latencyMs,
    };
    if (input.errorName) record.errorName = input.errorName;
    const prompt = findPromptByStage(input.stage);
    if (prompt) {
      record.promptId = prompt.promptId;
      record.promptVersion = prompt.version;
    }
    const usage = input.usage;
    if (usage && input.kind === "chat" && "promptTokens" in usage) {
      record.promptTokens = finiteOrUndefined(usage.promptTokens);
      record.completionTokens = finiteOrUndefined(usage.completionTokens);
      const cost = estimateChatCostUSD(input.model, usage);
      if (cost !== null) record.costUSD = round6(cost);
    } else if (usage && input.kind === "embedding" && "tokens" in usage) {
      record.tokens = finiteOrUndefined(usage.tokens);
      const cost = estimateEmbeddingCostUSD(input.model, usage);
      if (cost !== null) record.costUSD = round6(cost);
    }
    this.stages.push(record);
  }

  recordRetrieval(stats: RetrievalStats): void {
    if (this.finished) return;
    this.retrieval = stats;
  }

  setOutcome(outcome: RequestOutcome, err?: unknown): void {
    this.outcome = outcome;
    if (err !== undefined) this.errorName = errorNameOf(err);
  }

  finish(nowMs?: number): void {
    if (this.finished) return;
    this.finished = true;
    this.finishedAtMs = nowMs ?? Date.now();
  }

  /** Serializable envelope for the single end-of-request log line. */
  toLog(): RequestTraceLogEnvelope {
    let promptTokens = 0;
    let completionTokens = 0;
    let embeddingTokens = 0;
    let costUSD = 0;
    let anyCostKnown = false;
    for (const stage of this.stages) {
      if (stage.promptTokens) promptTokens += stage.promptTokens;
      if (stage.completionTokens) completionTokens += stage.completionTokens;
      if (stage.tokens) embeddingTokens += stage.tokens;
      if (stage.costUSD !== undefined) {
        costUSD += stage.costUSD;
        anyCostKnown = true;
      }
    }
    const endedAtMs = this.finishedAtMs ?? Date.now();
    return {
      requestId: this.requestId,
      navLocale: this.navLocale,
      outcome: this.outcome,
      ...(this.errorName ? { errorName: this.errorName } : {}),
      totalLatencyMs: endedAtMs - this.startedAtMs,
      retrieval: this.retrieval,
      stages: this.stages,
      totals: {
        llmCalls: this.stages.length,
        promptTokens,
        completionTokens,
        embeddingTokens,
        totalTokens: promptTokens + completionTokens + embeddingTokens,
        estimatedCostUSD: anyCostKnown ? round6(costUSD) : null,
      },
    };
  }
}

export function createRequestTrace(
  requestId: string,
  params: { navLocale: string }
): RequestTrace {
  return new RequestTrace(requestId, params);
}

// --- Request-scoped context (AsyncLocalStorage) -----------------------------

const traceStore = new AsyncLocalStorage<RequestTrace>();

/** Runs `fn` with `trace` as the active request-scoped trace. */
export function runWithTrace<T>(
  trace: RequestTrace,
  fn: () => Promise<T>
): Promise<T> {
  return traceStore.run(trace, fn);
}

/** The trace for the current async context, if any. */
export function getActiveTrace(): RequestTrace | undefined {
  return traceStore.getStore();
}

/** Emits the single structured trace log for a completed request. */
export function logRequestTrace(trace: RequestTrace): void {
  const traceLog = trace.toLog();
  logInfo("recruiter.trace", "request trace", traceLog);
  emitRequestTraceMetrics(traceLog);
}

// --- Call-site recorders (no-op when no active trace) -----------------------

type MaybeUsage = {
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    tokens?: number;
  };
};

function extractUsage(
  result: unknown,
  kind: ModelCallKind
): AnyTokenUsage | undefined {
  const usage = (result as MaybeUsage | null)?.usage;
  if (!usage) return undefined;
  if (kind === "chat" && typeof usage.promptTokens === "number") {
    return {
      promptTokens: usage.promptTokens,
      completionTokens:
        typeof usage.completionTokens === "number" ? usage.completionTokens : 0,
    };
  }
  if (kind === "embedding" && typeof usage.tokens === "number") {
    return { tokens: usage.tokens };
  }
  return undefined;
}

/**
 * Wraps an awaited `generateObject`/`generateText`/`embedMany` call, recording a
 * stage with latency, token usage, and estimated cost. Returns the call result
 * unchanged. Failures are recorded as `status: "error"` and re-thrown.
 */
export async function traceGenerate<T>(
  stage: string,
  model: string,
  kind: ModelCallKind,
  fn: () => Promise<T>
): Promise<T> {
  const trace = getActiveTrace();
  const startedAt = Date.now();
  try {
    const result = await fn();
    trace?.recordStage({
      stage,
      model,
      kind,
      status: "success",
      latencyMs: Date.now() - startedAt,
      usage: extractUsage(result, kind),
    });
    return result;
  } catch (err) {
    trace?.recordStage({
      stage,
      model,
      kind,
      status: "error",
      latencyMs: Date.now() - startedAt,
      errorName: err instanceof Error ? err.name : "UnknownError",
    });
    throw err;
  }
}

/**
 * Returns an `onFinish` callback for `streamText` that records the stage with
 * real token usage. Pass `startedAtMs` captured immediately before the
 * `streamText` call so latency covers the full stream duration.
 *
 * Prefer this over awaiting `result.usage` after the stream: the `usage`
 * Promise on the stream result can resolve before the provider's final usage
 * SSE event is processed, yielding undefined token counts for some models.
 * `onFinish` is always invoked after the stream is fully drained.
 */
export function makeStreamTraceOnFinish(
  stage: string,
  model: string,
  startedAtMs: number
): (event: {
  usage: { promptTokens: number; completionTokens: number };
}) => void {
  return ({ usage }) => {
    getActiveTrace()?.recordStage({
      stage,
      model,
      kind: "chat",
      status: "success",
      latencyMs: Date.now() - startedAtMs,
      usage,
    });
  };
}
