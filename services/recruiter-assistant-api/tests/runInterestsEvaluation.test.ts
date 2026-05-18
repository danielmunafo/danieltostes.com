import { describe, expect, it, vi, beforeEach } from "vitest";
import { generateText } from "ai";
import { INTERESTS_OUTPUT_SKIP_SENTINEL } from "../src/constants.js";
import { logInfo } from "../src/logging/logger.js";
import { evaluateInterests } from "../src/recruiterAssistant/agents/interests/evaluateInterests.js";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

vi.mock("../src/logging/logger.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/logging/logger.js")>();
  return {
    ...actual,
    logInfo: vi.fn(),
  };
});

const mockOpenai = vi
  .fn()
  .mockReturnValue("mock-model") as unknown as Parameters<
  typeof evaluateInterests
>[0]["openai"];

describe("evaluateInterests", () => {
  beforeEach(() => {
    vi.mocked(generateText).mockReset();
    vi.mocked(logInfo).mockReset();
  });

  it("does not call generateText when interests pack is missing", async () => {
    await evaluateInterests({
      openai: mockOpenai,
      navLocale: "en",
      userText: "role",
      evidenceEvaluationMarkdown: "# Eval\ncontent",
      interestsPack: null,
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("logs completion with omitted:true for skip sentinel output", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: INTERESTS_OUTPUT_SKIP_SENTINEL,
    } as Awaited<ReturnType<typeof generateText>>);

    await evaluateInterests({
      openai: mockOpenai,
      navLocale: "en",
      userText: "role",
      evidenceEvaluationMarkdown: "# Eval\ncontent",
      interestsPack: { schemaVersion: 1, criteriaMarkdown: "criteria" },
    });

    expect(generateText).toHaveBeenCalled();
    expect(logInfo).toHaveBeenCalledWith(
      "interestsEvaluator",
      "interests evaluation completed but not streamed",
      expect.objectContaining({ omitted: true })
    );
  });

  it("logs completion with omitted:false for substantive output", async () => {
    vi.mocked(generateText).mockResolvedValue({
      text: "# Preference alignment\n| row |",
    } as Awaited<ReturnType<typeof generateText>>);

    await evaluateInterests({
      openai: mockOpenai,
      navLocale: "en",
      userText: "role",
      evidenceEvaluationMarkdown: "# Eval\ncontent",
      interestsPack: { schemaVersion: 1, criteriaMarkdown: "criteria" },
    });

    expect(logInfo).toHaveBeenCalledWith(
      "interestsEvaluator",
      "interests evaluation completed but not streamed",
      expect.objectContaining({ omitted: false, chars: expect.any(Number) })
    );
  });
});
