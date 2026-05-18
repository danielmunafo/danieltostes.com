import { describe, expect, it } from "vitest";
import { assessHardGates } from "../src/rag/hardGates/assessHardGates.js";
import { parseEvaluatorTable } from "../src/rag/hardGates/parseEvaluatorTable.js";

const enTable = `# Requirement Coverage
| Requirement | Importance | Evidence Level | Notes |
|---|---|---|---|
| German fluency | Must-have | Not evidenced | JD requires German |
| Production Golang | Must-have | Not evidenced | No Go excerpts |
| TypeScript systems | Must-have | Direct | Strong fintech evidence |
# Match Score Guidance
**Recommended match strength:** 6/10
`;

const ptTable = `# Cobertura dos requisitos
| Requisito | Importância | Nível de evidência | Observações |
|---|---|---|---|
| Alemão fluente | Obrigatório | Não evidenciado | JD exige alemão |
| Golang produção | Obrigatório | Não evidenciado | Sem trechos Go |
# Orientação de pontuação de aderência
**Pontuação de aderência recomendada:** 6/10
`;

describe("parseEvaluatorTable", () => {
  it("parses English requirement rows as hard gates", () => {
    const rows = parseEvaluatorTable(enTable, "en");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.some((r) => r.category === "spoken_language")).toBe(true);
    expect(rows.some((r) => r.category === "primary_stack")).toBe(true);
  });

  it("parses pt-BR localized evidence tokens", () => {
    const rows = parseEvaluatorTable(ptTable, "pt-BR");
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.every((r) => r.evidenceLevel === "not_evidenced")).toBe(true);
  });

  it("feeds fiskaly-style table into assessment with cap <= 5", () => {
    const rows = parseEvaluatorTable(enTable, "en");
    const assessment = assessHardGates(rows, enTable, "en");
    expect(assessment.effectiveMaxTechnicalFit).toBeLessThanOrEqual(5);
    expect(assessment.blockedRecommendations).toContain("pursue");
    expect(assessment.allowedRecommendations).not.toContain("pursue");
  });
});
