import { describe, expect, it, vi } from "vitest";
import { createRecruiterOpenAIProvider } from "../src/recruiterAssistant/createRecruiterAssistantDependencies.js";
import { RequestTrace, runWithTrace } from "../src/tracing/requestTrace.js";
import { traceStreamText } from "../src/reliability/streamTextReliability.js";

function openAiStreamChunk(body: unknown): string {
  return `data: ${JSON.stringify(body)}\n\n`;
}

function openAiStreamResponse(chunks: readonly unknown[]): Response {
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(openAiStreamChunk(chunk)));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    }),
    {
      headers: {
        "content-type": "text/event-stream",
      },
    }
  );
}

describe("createRecruiterOpenAIProvider", () => {
  it("requests stream usage and records cost for streamed OpenAI calls", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      openAiStreamResponse([
        {
          id: "chatcmpl-test",
          object: "chat.completion.chunk",
          created: 1_785_000_000,
          model: "gpt-4.1-nano",
          choices: [
            {
              index: 0,
              delta: { content: "hello" },
              finish_reason: null,
            },
          ],
        },
        {
          id: "chatcmpl-test",
          object: "chat.completion.chunk",
          created: 1_785_000_000,
          model: "gpt-4.1-nano",
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: "stop",
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 2,
            total_tokens: 12,
          },
        },
      ])
    );
    const openai = createRecruiterOpenAIProvider("test-key", {
      fetch: fetchImpl,
    });
    const trace = new RequestTrace("req-1", {
      navLocale: "en",
      nowMs: 1000,
    });

    const text = await runWithTrace(trace, async () => {
      const stream = traceStreamText({
        traceStage: "pitch",
        traceModel: "gpt-4.1-nano",
        model: openai("gpt-4.1-nano"),
        prompt: "hello",
      });
      await stream.result.consumeStream();
      return stream.text;
    });

    expect(text).toBe("hello");
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      stream: true,
      stream_options: { include_usage: true },
    });

    const log = trace.toLog();
    expect(log.totals).toMatchObject({
      usageKnownCalls: 1,
      usageMissingCalls: 0,
      costKnownCalls: 1,
      costMissingCalls: 0,
      promptTokens: 10,
      completionTokens: 2,
    });
    expect(log.stages[0]).toMatchObject({
      stage: "pitch",
      status: "success",
      promptTokens: 10,
      completionTokens: 2,
      costUSD: 0.000002,
    });
  });
});
