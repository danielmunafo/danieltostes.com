import { createOpenAI } from "@ai-sdk/openai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "../src/logging/logger.js";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateObject: vi.fn(() =>
      Promise.reject(new Error("structured output unavailable"))
    ),
  };
});

const { runIntentGate } = await import("../src/security/intentGate.js");

describe("runIntentGate logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs classifier failures instead of swallowing them", async () => {
    const logErrorSpy = vi
      .spyOn(loggerModule, "logError")
      .mockImplementation(() => {});

    const openai = createOpenAI({ apiKey: "test-key" });
    const result = await runIntentGate(
      openai,
      "Senior backend engineer role at a fintech"
    );

    expect(result).toEqual({ ok: false, reason: "intent_unclear" });
    expect(logErrorSpy).toHaveBeenCalledOnce();
    expect(logErrorSpy.mock.calls[0]?.[0]).toBe("intentGate");
    expect(logErrorSpy.mock.calls[0]?.[1]).toBe("classifier failed");
    expect(logErrorSpy.mock.calls[0]?.[2]).toBeInstanceOf(Error);
  });
});
