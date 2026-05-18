import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assessHardGates } from "../src/rag/hardGates/assessHardGates.js";
import { parseEvaluatorTable } from "../src/rag/hardGates/parseEvaluatorTable.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const fiskalyEvaluatorMarkdown = `# Requirement Coverage
| Requirement | Importance | Evidence Level | Notes |
|---|---|---|---|
| German fluency | Must-have | Not evidenced | JD requires fluent German |
| Production Golang | Must-have | Not evidenced | No Go production excerpts |
| Distributed systems | Must-have | Direct | Klarna-scale systems |
# Match Score Guidance
**Recommended match strength:** 7/10
**Evidence confidence:** Medium
**Reason:** Strong platform overlap but missing language and Go.
**Score caps applied:** None
`;

describe("fiskaly golden: German + Golang hard gates", () => {
  it("caps effective fit at 5 or below and blocks Pursue", () => {
    const rows = parseEvaluatorTable(fiskalyEvaluatorMarkdown, "en");
    const assessment = assessHardGates(rows, fiskalyEvaluatorMarkdown, "en");
    expect(assessment.effectiveMaxTechnicalFit).toBeLessThanOrEqual(5);
    expect(assessment.blockedRecommendations).toContain("pursue");
    expect(assessment.allowedRecommendations).not.toContain("pursue");
    expect(assessment.allowedRecommendations).not.toContain("strong_pursue");
  });

  it("fiskaly JD fixture is loadable for retrieval query builder smoke", () => {
    const jd = readFileSync(
      join(__dirname, "fixtures", "fiskaly-style-backend-jd.txt"),
      "utf8"
    );
    expect(jd).toContain("German");
    expect(jd).toContain("Golang");
  });
});

describe("strong-fit regression", () => {
  const strongEval = `# Requirement Coverage
| Requirement | Importance | Evidence Level | Notes |
|---|---|---|---|
| TypeScript full-stack | Must-have | Direct | Strong evidence |
| Platform ownership | Must-have | Direct | Clear ownership |
# Match Score Guidance
**Recommended match strength:** 8/10
`;

  it("allows pursue labels when no hard gates miss", () => {
    const rows = parseEvaluatorTable(strongEval, "en");
    const assessment = assessHardGates(rows, strongEval, "en");
    expect(assessment.maxTechnicalFit).toBe(10);
    expect(assessment.effectiveMaxTechnicalFit).toBe(8);
    expect(assessment.allowedRecommendations).toContain("strong_pursue");
    expect(assessment.allowedRecommendations).toContain("pursue");
    expect(assessment.blockedRecommendations).toHaveLength(0);
  });
});
