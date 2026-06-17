import { describe, expect, it, vi } from "vitest";
import { createDataStreamResponse, formatDataStreamPart } from "ai";
import * as loggerModule from "../src/logging/logger.js";
import {
  RequestTrace,
  getActiveTrace,
  logRequestTrace,
  runWithTrace,
  traceGenerate,
} from "../src/tracing/requestTrace.js";

function newTrace(): RequestTrace {
  return new RequestTrace("req-1", { navLocale: "en", nowMs: 1000 });
}

describe("RequestTrace.recordStage", () => {
  it("records a chat stage with tokens and estimated cost", () => {
    const trace = newTrace();
    trace.recordStage({
      stage: "pitch",
      model: "gpt-4.1-nano",
      kind: "chat",
      status: "success",
      latencyMs: 120,
      usage: { promptTokens: 1_000_000, completionTokens: 0 },
    });
    const log = trace.toLog();
    const stages = log.stages as Array<Record<string, unknown>>;
    expect(stages).toHaveLength(1);
    expect(stages[0]).toMatchObject({
      stage: "pitch",
      status: "success",
      promptTokens: 1_000_000,
      completionTokens: 0,
      costUSD: 0.1,
    });
  });

  it("records an embedding stage with token count and cost", () => {
    const trace = newTrace();
    trace.recordStage({
      stage: "retrieval_embed",
      model: "text-embedding-3-small",
      kind: "embedding",
      status: "success",
      latencyMs: 30,
      usage: { tokens: 1_000_000 },
    });
    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages[0]).toMatchObject({ tokens: 1_000_000, costUSD: 0.02 });
  });

  it("aggregates tokens and cost across mixed stages", () => {
    const trace = newTrace();
    trace.recordStage({
      stage: "pitch",
      model: "gpt-4.1-nano",
      kind: "chat",
      status: "success",
      latencyMs: 100,
      usage: { promptTokens: 1_000_000, completionTokens: 1_000_000 },
    });
    trace.recordStage({
      stage: "retrieval_embed",
      model: "text-embedding-3-small",
      kind: "embedding",
      status: "success",
      latencyMs: 20,
      usage: { tokens: 500_000 },
    });
    const totals = trace.toLog().totals as Record<string, number>;
    expect(totals.llmCalls).toBe(2);
    expect(totals.promptTokens).toBe(1_000_000);
    expect(totals.completionTokens).toBe(1_000_000);
    expect(totals.embeddingTokens).toBe(500_000);
    expect(totals.totalTokens).toBe(2_500_000);
    // 0.1 + 0.4 (chat) + 0.01 (embedding)
    expect(totals.estimatedCostUSD).toBeCloseTo(0.51, 6);
  });

  it("records token usage but no cost for an unknown model", () => {
    const trace = newTrace();
    trace.recordStage({
      stage: "pitch",
      model: "mystery-model",
      kind: "chat",
      status: "success",
      latencyMs: 100,
      usage: { promptTokens: 1000, completionTokens: 1000 },
    });
    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages[0].promptTokens).toBe(1000);
    expect(stages[0].costUSD).toBeUndefined();
    const totals = trace.toLog().totals as Record<string, unknown>;
    expect(totals.estimatedCostUSD).toBeNull();
  });

  it("captures error status and error name", () => {
    const trace = newTrace();
    trace.recordStage({
      stage: "chart",
      model: "gpt-4.1-nano",
      kind: "chat",
      status: "error",
      latencyMs: 80,
      errorName: "APICallError",
    });
    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages[0]).toMatchObject({
      status: "error",
      errorName: "APICallError",
    });
  });

  it("ignores stages recorded after finish()", () => {
    const trace = newTrace();
    trace.finish(2000);
    trace.recordStage({
      stage: "interests",
      model: "gpt-4.1-nano",
      kind: "chat",
      status: "success",
      latencyMs: 10,
      usage: { promptTokens: 10, completionTokens: 10 },
    });
    expect((trace.toLog().stages as unknown[]).length).toBe(0);
  });
});

describe("RequestTrace metadata", () => {
  it("records retrieval stats", () => {
    const trace = newTrace();
    trace.recordRetrieval({
      provider: "llamaindex-native",
      topK: 30,
      returnedChunks: 28,
      similarityMin: 0.31,
      similarityMax: 0.74,
      latencyMs: 180,
    });
    expect(trace.toLog().retrieval).toMatchObject({
      provider: "llamaindex-native",
      topK: 30,
      returnedChunks: 28,
      similarityMin: 0.31,
      similarityMax: 0.74,
    });
  });

  it("reflects outcome and total latency from finish()", () => {
    const trace = newTrace();
    trace.setOutcome("error", new TypeError("boom"));
    trace.finish(3500);
    const log = trace.toLog();
    expect(log.outcome).toBe("error");
    expect(log.errorName).toBe("TypeError");
    expect(log.totalLatencyMs).toBe(2500);
  });
});

describe("logRequestTrace", () => {
  it("emits exactly one recruiter.trace log line", () => {
    const spy = vi.spyOn(loggerModule, "logInfo").mockImplementation(() => {});
    const trace = newTrace();
    trace.finish(1500);
    logRequestTrace(trace);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0]?.[0]).toBe("recruiter.trace");
    expect(spy.mock.calls[0]?.[1]).toBe("request trace");
    expect(spy.mock.calls[0]?.[2]).toMatchObject({ requestId: "req-1" });
    spy.mockRestore();
  });
});

describe("traceGenerate + AsyncLocalStorage", () => {
  it("records a stage inside an active trace and returns the result", async () => {
    const trace = newTrace();
    const result = await runWithTrace(trace, async () =>
      traceGenerate("hard_gates", "gpt-4.1-nano", "chat", async () => ({
        object: { ok: true },
        usage: { promptTokens: 100, completionTokens: 20 },
      }))
    );
    expect(result.object.ok).toBe(true);
    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages[0]).toMatchObject({
      stage: "hard_gates",
      status: "success",
      promptTokens: 100,
      completionTokens: 20,
    });
  });

  it("records an error stage and re-throws", async () => {
    const trace = newTrace();
    await expect(
      runWithTrace(trace, async () =>
        traceGenerate("hard_gates", "gpt-4.1-nano", "chat", async () => {
          throw new TypeError("nope");
        })
      )
    ).rejects.toThrow("nope");
    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages[0]).toMatchObject({
      status: "error",
      errorName: "TypeError",
    });
  });

  it("is a no-op outside any trace scope", async () => {
    expect(getActiveTrace()).toBeUndefined();
    const result = await traceGenerate(
      "hard_gates",
      "gpt-4.1-nano",
      "chat",
      async () => ({
        object: 1,
        usage: { promptTokens: 1, completionTokens: 1 },
      })
    );
    expect(result.object).toBe(1);
  });
});

describe("trace wiring through createDataStreamResponse", () => {
  it("propagates ALS into execute and emits one trace when the stream is consumed", async () => {
    const spy = vi.spyOn(loggerModule, "logInfo").mockImplementation(() => {});
    const trace = newTrace();

    // Mirrors createRecruiterAssistantStreamResponse: ALS is established inside
    // `execute`, a deep call records via getActiveTrace(), and the single trace
    // log is emitted in `finally` once the stream completes.
    const response = createDataStreamResponse({
      execute: async (dataStream) => {
        try {
          await runWithTrace(trace, async () => {
            await traceGenerate("pitch", "gpt-4.1-nano", "chat", async () => ({
              text: "ok",
              usage: { promptTokens: 50, completionTokens: 10 },
            }));
            dataStream.write(formatDataStreamPart("text", "hi"));
          });
          trace.setOutcome("success");
        } finally {
          trace.finish();
          logRequestTrace(trace);
        }
      },
    });

    await response.text();

    const traceCalls = spy.mock.calls.filter((c) => c[0] === "recruiter.trace");
    expect(traceCalls).toHaveLength(1);
    const payload = traceCalls[0]?.[2] as {
      outcome: string;
      stages: unknown[];
      totals: { estimatedCostUSD: number | null };
    };
    expect(payload.outcome).toBe("success");
    expect(payload.stages).toHaveLength(1);
    expect(payload.totals.estimatedCostUSD).toBeGreaterThan(0);
    spy.mockRestore();
  });
});
