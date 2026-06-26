import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecruiterAssistantDependencies } from "../src/recruiterAssistant/types.js";
import type { IntentGateResult } from "../src/security/intentGate.js";

type IntentGateRejectionReason = Extract<
  IntentGateResult,
  { ok: false }
>["reason"];

const TEST_ORIGIN = "https://client.example";
const mockOpenAi: RecruiterAssistantDependencies["openai"] = () => undefined;

vi.mock(
  "../src/recruiterAssistant/createRecruiterAssistantDependencies.js",
  () => ({
    createRecruiterAssistantDependencies: vi.fn(async () => ({
      openai: () => undefined,
    })),
  })
);

vi.mock("../src/security/intentGate.js", () => ({
  runIntentGate: vi.fn(),
}));

vi.mock("../src/feedback/writeFeedbackToS3.js", () => ({
  saveChatTrace: vi.fn(),
}));

vi.mock("../src/tracing/requestTrace.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/tracing/requestTrace.js")>();
  return {
    ...actual,
    logRequestTrace: vi.fn(),
  };
});

const { handleChatRequest } = await import("../src/handler.js");
const { createRecruiterAssistantDependencies } =
  await import("../src/recruiterAssistant/createRecruiterAssistantDependencies.js");
const { runIntentGate } = await import("../src/security/intentGate.js");
const { saveChatTrace } = await import("../src/feedback/writeFeedbackToS3.js");
const { logRequestTrace } = await import("../src/tracing/requestTrace.js");

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function chatEvent(userText: string, sourceIp: string) {
  return {
    requestContext: { http: { method: "POST", sourceIp } },
    headers: { origin: TEST_ORIGIN },
    body: JSON.stringify({
      messages: [{ role: "user", content: userText }],
      locale: "en",
    }),
    isBase64Encoded: false,
  };
}

function expectRejectedTrace(reason: IntentGateRejectionReason): void {
  expect(logRequestTrace).toHaveBeenCalledOnce();
  expect(saveChatTrace).toHaveBeenCalledOnce();

  const trace = vi.mocked(logRequestTrace).mock.calls[0]?.[0];
  expect(trace).toBeDefined();
  if (!trace) throw new Error("Expected a logged request trace");

  const traceLog = trace.toLog();
  expect(traceLog).toMatchObject({
    requestId: trace.requestId,
    navLocale: "en",
    outcome: "error",
    errorName: reason,
  });

  const stageCount = (traceLog.stages as unknown[]).length;
  trace.recordStage({
    stage: "pitch",
    model: "gpt-4.1-nano",
    kind: "chat",
    status: "success",
    latencyMs: 1,
  });
  expect(trace.toLog().stages as unknown[]).toHaveLength(stageCount);

  expect(vi.mocked(saveChatTrace).mock.calls[0]?.[0]).toBe(trace.requestId);
  expect(vi.mocked(saveChatTrace).mock.calls[0]?.[1]).toMatchObject({
    requestId: trace.requestId,
    outcome: "error",
    errorName: reason,
  });
}

describe("handleChatRequest rejected intent traces", () => {
  const prevAllowedOrigin = process.env.ALLOWED_ORIGIN;
  const prevLambda = process.env.AWS_LAMBDA_FUNCTION_NAME;
  const prevCaptcha = process.env.RECAPTCHA_SECRET_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ALLOWED_ORIGIN = TEST_ORIGIN;
    delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    delete process.env.RECAPTCHA_SECRET_KEY;
    vi.mocked(createRecruiterAssistantDependencies).mockResolvedValue({
      openai: mockOpenAi,
    });
  });

  afterEach(() => {
    restoreEnv("ALLOWED_ORIGIN", prevAllowedOrigin);
    restoreEnv("AWS_LAMBDA_FUNCTION_NAME", prevLambda);
    restoreEnv("RECAPTCHA_SECRET_KEY", prevCaptcha);
  });

  it("finalizes, logs, and saves the trace for off-topic intent rejections", async () => {
    vi.mocked(runIntentGate).mockResolvedValue({
      ok: false,
      reason: "off_topic",
    });

    const res = await handleChatRequest(
      chatEvent("Can you write me a cake recipe?", "203.0.113.41")
    );

    expect(res.status).toBe(400);
    expect(res.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);
    await expect(res.json()).resolves.toEqual({ error: "off_topic" });
    expectRejectedTrace("off_topic");
  });

  it("finalizes, logs, and saves the trace for intent gate failures", async () => {
    vi.mocked(runIntentGate).mockResolvedValue({
      ok: false,
      reason: "intent_unclear",
    });

    const res = await handleChatRequest(
      chatEvent("Senior backend engineer role", "203.0.113.42")
    );

    expect(res.status).toBe(400);
    expect(res.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);
    await expect(res.json()).resolves.toEqual({ error: "intent_unclear" });
    expectRejectedTrace("intent_unclear");
  });
});
