import { afterEach, describe, expect, it, vi } from "vitest";
import { MockLanguageModelV1, simulateReadableStream } from "ai/test";
import type {
  LanguageModelV1CallOptions,
  LanguageModelV1StreamPart,
} from "@ai-sdk/provider";
import { ModelCallTimeoutError } from "../src/reliability/modelCallReliability.js";
import {
  createStreamTextRequestScope,
  traceStreamText,
} from "../src/reliability/streamTextReliability.js";
import { RequestTrace, runWithTrace } from "../src/tracing/requestTrace.js";

function newTrace(): RequestTrace {
  return new RequestTrace("req-1", { navLocale: "en", nowMs: 1000 });
}

function rawCall() {
  return { rawPrompt: null, rawSettings: {} };
}

describe("traceStreamText", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("records streamed success with token usage", async () => {
    const trace = newTrace();
    let observedSignal: AbortSignal | undefined;
    const model = new MockLanguageModelV1({
      modelId: "gpt-4.1-nano",
      doStream: async (options: LanguageModelV1CallOptions) => {
        observedSignal = options.abortSignal;
        return {
          stream: simulateReadableStream<LanguageModelV1StreamPart>({
            chunks: [
              { type: "text-delta", textDelta: "hello" },
              {
                type: "finish",
                finishReason: "stop",
                usage: { promptTokens: 10, completionTokens: 2 },
              },
            ],
            initialDelayInMs: null,
            chunkDelayInMs: null,
          }),
          rawCall: rawCall(),
        };
      },
    });

    const text = await runWithTrace(trace, async () => {
      const stream = traceStreamText({
        traceStage: "pitch",
        traceModel: "gpt-4.1-nano",
        model,
        prompt: "hello",
      });
      await stream.result.consumeStream();
      return stream.text;
    });

    expect(text).toBe("hello");
    expect(observedSignal).toBeInstanceOf(AbortSignal);
    expect(observedSignal?.aborted).toBe(false);
    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages).toHaveLength(1);
    expect(stages[0]).toMatchObject({
      stage: "pitch",
      status: "success",
      promptTokens: 10,
      completionTokens: 2,
    });
  });

  it("records stream provider failures with error name", async () => {
    const trace = newTrace();
    const providerError = new TypeError("provider stream failed");
    const model = new MockLanguageModelV1({
      modelId: "gpt-4.1-nano",
      doStream: async () => ({
        stream: simulateReadableStream<LanguageModelV1StreamPart>({
          chunks: [
            { type: "text-delta", textDelta: "partial" },
            { type: "error", error: providerError },
          ],
          initialDelayInMs: null,
          chunkDelayInMs: null,
        }),
        rawCall: rawCall(),
      }),
    });

    const text = await runWithTrace(trace, async () => {
      const stream = traceStreamText({
        traceStage: "evidence_analysis",
        traceModel: "gpt-4.1-nano",
        model,
        prompt: "hello",
      });
      await stream.result.consumeStream();
      return stream.text;
    });

    expect(text).toBe("partial");
    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages).toHaveLength(1);
    expect(stages[0]).toMatchObject({
      stage: "evidence_analysis",
      status: "error",
      errorName: "TypeError",
    });
  });

  it("aborts a streaming stage when the request budget expires", async () => {
    vi.useFakeTimers();
    const trace = newTrace();
    let observedSignal: AbortSignal | undefined;
    const model = new MockLanguageModelV1({
      modelId: "gpt-4.1-nano",
      doStream: async (options: LanguageModelV1CallOptions) => {
        observedSignal = options.abortSignal;
        return {
          stream: new ReadableStream<LanguageModelV1StreamPart>({
            start(controller) {
              options.abortSignal?.addEventListener(
                "abort",
                () => {
                  controller.error(options.abortSignal?.reason);
                },
                { once: true }
              );
            },
          }),
          rawCall: rawCall(),
        };
      },
    });
    const requestScope = createStreamTextRequestScope(15);

    const result = runWithTrace(trace, async () => {
      const stream = traceStreamText({
        traceStage: "briefing_prep",
        traceModel: "gpt-4.1-nano",
        traceSignal: requestScope.signal,
        traceTimeoutMs: 1_000,
        model,
        prompt: "hello",
      });
      void stream.result.consumeStream();
      return stream.text;
    });
    const rejection = result.catch((err: unknown) => err);

    await vi.advanceTimersByTimeAsync(0);
    expect(observedSignal?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(15);
    const err = await rejection;
    expect(err).toBeInstanceOf(ModelCallTimeoutError);
    expect(observedSignal?.aborted).toBe(true);

    const stages = trace.toLog().stages as Array<Record<string, unknown>>;
    expect(stages).toHaveLength(1);
    expect(stages[0]).toMatchObject({
      stage: "briefing_prep",
      status: "error",
      errorName: "ModelCallTimeoutError",
    });

    requestScope.cleanup();
  });
});
