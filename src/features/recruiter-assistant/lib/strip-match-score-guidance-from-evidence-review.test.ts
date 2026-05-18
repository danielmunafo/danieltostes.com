import { describe, expect, it } from "vitest";
import { stripMatchScoreGuidanceFromEvidenceReview } from "./strip-match-score-guidance-from-evidence-review";

describe("stripMatchScoreGuidanceFromEvidenceReview", () => {
  it("removes English match score guidance including recommended match strength", () => {
    const input = `# Requirement Coverage
| Req | Must-have | Direct | ok |

# Misleading similarity check
- note

# Match Score Guidance
**Recommended match strength:** 7/10
**Evidence confidence:** Medium
**Reason:** gaps remain

---

# Candidate Alignment Summary
- bullet`;

    const out = stripMatchScoreGuidanceFromEvidenceReview(input);
    expect(out).not.toContain("Recommended match strength");
    expect(out).not.toContain("Match Score Guidance");
    expect(out).toContain("Requirement Coverage");
    expect(out).toContain("Misleading similarity");
    expect(out).toContain("Candidate Alignment Summary");
  });

  it("removes localized pt-BR heading", () => {
    const input = `# Cobertura dos requisitos
| a | b |

# Orientação de pontuação de aderência
**Pontuação de aderência recomendada:** 6/10
**Confiança nas evidências:** Média

# Resumo de alinhamento
- x`;

    const out = stripMatchScoreGuidanceFromEvidenceReview(input);
    expect(out).not.toContain("Pontuação de aderência recomendada");
    expect(out).toContain("Cobertura dos requisitos");
    expect(out).toContain("Resumo de alinhamento");
  });

  it("returns empty string unchanged", () => {
    expect(stripMatchScoreGuidanceFromEvidenceReview("")).toBe("");
  });
});
