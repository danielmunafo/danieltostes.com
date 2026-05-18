import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractHardGateRows } from "../src/rag/hardGates/index.js";
import { parseEvaluatorTable } from "../src/rag/hardGates/parseEvaluatorTable.js";
import { assessHardGates } from "../src/recruiterAssistant/agents/hardGates/assessHardGates.js";

vi.mock("../src/rag/hardGates/index.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/rag/hardGates/index.js")>();
  return {
    ...actual,
    extractHardGateRows: vi.fn(),
  };
});

const fiskalyEvaluatorMarkdown = `# Requirement Coverage
| Requirement | Importance | Evidence Level | Notes |
|---|---|---|---|
| German fluency | Must-have | Not evidenced | JD requires fluent German |
| Production Golang | Must-have | Not evidenced | No Go production excerpts |
| Distributed systems | Must-have | Direct | Klarna-scale systems |
# Match Score Guidance
**Recommended match strength:** 7/10
`;

const mockOpenai = {} as Parameters<typeof assessHardGates>[0]["openai"];

describe("assessHardGates", () => {
  beforeEach(() => {
    vi.mocked(extractHardGateRows).mockReset();
  });

  it("skips assessment when evaluation is off-topic", async () => {
    const result = await assessHardGates({
      openai: mockOpenai,
      navLocale: "en",
      userText: "jd text",
      evidenceEvaluationMarkdown: "# Off-topic input\nNothing to evaluate.",
      isOffTopic: true,
    });
    expect(result.assessment).toBeNull();
    expect(result.hardGateAssessmentMarkdown).toBe("");
    expect(result.maxTechnicalFitAllowedByHardGates).toBe(10);
    expect(extractHardGateRows).not.toHaveBeenCalled();
  });

  it("returns hard-gate block and capped fit when gates apply", async () => {
    const rows = parseEvaluatorTable(fiskalyEvaluatorMarkdown, "en");
    vi.mocked(extractHardGateRows).mockResolvedValue(rows);

    const result = await assessHardGates({
      openai: mockOpenai,
      navLocale: "en",
      userText: "Golang backend Berlin",
      evidenceEvaluationMarkdown: fiskalyEvaluatorMarkdown,
      isOffTopic: false,
    });

    expect(extractHardGateRows).toHaveBeenCalled();
    expect(result.assessment).not.toBeNull();
    expect(result.maxTechnicalFitAllowedByHardGates).toBeLessThanOrEqual(5);
    expect(result.hardGateAssessmentMarkdown.length).toBeGreaterThan(0);
  });
});
