import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assessHardGates } from "../src/rag/hardGates/assessHardGates.js";
import { formatHardGateAssessmentBlock } from "../src/rag/hardGates/formatHardGateBlock.js";
import { parseEvaluatorTable } from "../src/rag/hardGates/parseEvaluatorTable.js";
import {
  buildEvidenceAnalystUserPrompt,
  buildRecruiterPitchSystemPrompt,
} from "../src/rag/prompt.js";
import {
  buildEvidenceEvaluatorSystemPrompt,
  buildEvidenceEvaluatorUserPrompt,
  EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN,
} from "../src/rag/evaluatorPrompt.js";
import {
  renderReferencesMarkdown,
  type ReferenceItem,
} from "../src/rag/references.js";
import type { EmbeddingChunk } from "../src/rag/retrieve.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "fixtures");

function readFixture(name: string): string {
  return readFileSync(join(fixturesDir, name), "utf8").trim();
}

const fakeExcerpts = `### Source 1: [experience] Sample
Daniel shipped TypeScript/React production systems and led reliability work in fintech.`;

describe("evidence evaluation scaffolding (fixtures)", () => {
  it("evaluator user prompt for AI model validator JD references SHAP and caps in system rules", () => {
    const jd = readFixture("ai-model-validator-jd.txt");
    const system = buildEvidenceEvaluatorSystemPrompt("en");
    const user = buildEvidenceEvaluatorUserPrompt("en", jd, fakeExcerpts);
    expect(user).toContain("SHAP");
    expect(system).toContain("SHAP/LIME");
    expect(system).toContain(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN);
    expect(system).toContain("cap the recommended match strength at **5**");
    expect(system).toContain(
      "Single-primary-stack backend / language-centric role"
    );
  });

  it("evaluator system prompt treats professional-context excerpts as first-class evidence", () => {
    const system = buildEvidenceEvaluatorSystemPrompt("en");
    expect(system).toContain("professional-context");
    expect(system).toContain("first-class evidence");
    expect(system).toContain("written/oral English communication");
    expect(system).toContain("regulated-domain");
  });

  it("analyst user prompt chains evaluator markdown for staff full-stack fixture", () => {
    const jd = readFixture("staff-fullstack-jd.txt");
    const fakeEval =
      "# Requirement Coverage\n| Req | Must-have | Direct | ok |\n|---|---|---|---|\n";
    const hardGateBlock = formatHardGateAssessmentBlock(
      assessHardGates([], fakeEval, "en"),
      "en"
    );
    const analystUser = buildEvidenceAnalystUserPrompt(
      "en",
      jd,
      fakeExcerpts,
      fakeEval,
      hardGateBlock
    );
    expect(analystUser).toContain(fakeEval);
    expect(analystUser).toContain("TypeScript");
    expect(analystUser).toContain("Backend-enforced hard gate assessment");
  });

  it("pitch prompt for composed brief includes match cap ceiling and executive headings", () => {
    const composed = [
      "# Match Score Guidance\nRecommended match strength: 8/10\nEvidence confidence: High\nEvidence confidence reason: test\nReason: test",
      "# Candidate Alignment Summary\n- bullet",
    ].join("\n\n---\n\n");
    const pitch = buildRecruiterPitchSystemPrompt(composed, fakeExcerpts);
    expect(pitch).toContain("Effective max technical fit");
    expect(pitch).toContain("Recommended match strength");
    expect(pitch).toContain("# Verdict");
    expect(pitch).toContain("Practical Fit Risks");
  });

  it("fiskaly-style fixture is represented in evaluator and pitch scaffolding", () => {
    const jd = readFixture("fiskaly-style-backend-jd.txt");
    const evalUser = buildEvidenceEvaluatorUserPrompt("en", jd, fakeExcerpts);
    expect(evalUser).toContain("Golang");
    expect(evalUser).toContain("German");
    const evalSystem = buildEvidenceEvaluatorSystemPrompt("en");
    expect(evalSystem).toContain("Two or more role-defining hard gates");
    expect(evalSystem).toContain(
      "Spoken-language hard gate + another missing gate"
    );
    const fiskalyEval = `# Requirement Coverage
| Requirement | Importance | Evidence Level | Notes |
|---|---|---|---|
| German fluent | Must-have | Not evidenced | JD requires German |
| Production Golang | Must-have | Not evidenced | No Go excerpts |
# Match Score Guidance
**Recommended match strength:** 6/10
Evidence confidence: Medium
Evidence confidence reason: Go-heavy role; excerpts show TypeScript systems.
Reason: adjacent fit
Score caps applied: None`;
    const rows = parseEvaluatorTable(fiskalyEval, "en");
    const assessment = assessHardGates(rows, fiskalyEval, "en");
    const hardGateBlock = formatHardGateAssessmentBlock(assessment, "en");
    const pitch = buildRecruiterPitchSystemPrompt(
      fiskalyEval,
      fakeExcerpts,
      "English",
      "en",
      hardGateBlock,
      assessment.effectiveMaxTechnicalFit
    );
    expect(pitch).toContain("HARD MUST-HAVE OVERRIDE");
    expect(pitch).toContain("Deterministic hard gate assessment");
    expect(pitch).toContain("Blocked recommendations");
    expect(pitch).toContain("Allowed recommendations");
    expect(pitch).toContain("Weak fit");
    expect(pitch).toContain("German");
    expect(pitch).toContain("German + Golang");
    expect(pitch).toContain(
      "Do **not** output **Strong pursue** or **Pursue** when **multiple**"
    );
    expect(pitch).not.toContain(
      "effective max technical fit (backend-enforced): 10"
    );
  });

  it("staff full-stack pitch prompt lists strong recommendation label", () => {
    const pitch = buildRecruiterPitchSystemPrompt(
      `# Match Score Guidance\nRecommended match strength: 8/10\nEvidence confidence: High\nEvidence confidence reason: Strong TS match.\nReason: ok\nScore caps applied: None\n\n# Candidate Alignment Summary\n- x`,
      fakeExcerpts
    );
    expect(pitch).toContain("Strong pursue");
    expect(pitch).toContain("# Verdict");
    expect(pitch).toContain("SCORING CALIBRATION");
    expect(pitch).toContain("**Moderate:**");
  });
});

const fakeKlarnaChunk: EmbeddingChunk = {
  id: "en-section-experience-item-0-s0-p0",
  text: "Fintech engineering at Klarna across high-traffic consumer flows.",
  embedding: [1, 0, 0],
  metadata: {
    locale: "en",
    sectionId: "experience",
    title: "Klarna",
    category: "experience",
    scrollTargetId: "section-experience-item-0",
  },
};

describe("fiskaly regression: pitch prompt scaffolding", () => {
  it("Why Not Higher is required whenever Technical fit is below 10", () => {
    const pitch = buildRecruiterPitchSystemPrompt(
      `# Requirement Coverage\n| Golang | Must-have | Not evidenced | No Go excerpts |\n|---|---|---|---|\n# Match Score Guidance\nRecommended match strength: 5/10\nEvidence confidence: Medium\nEvidence confidence reason: Go-heavy role.\nReason: Adjacent fit\nScore caps applied: None`,
      fakeExcerpts
    );
    expect(pitch).toContain("# Why Not Higher?");
    expect(pitch).toContain("Y < 10");
    expect(pitch).toContain("Omit this heading only when Y = 10");
  });

  it("Practical Fit Risks scaffolding covers language, contract, and location", () => {
    const pitch = buildRecruiterPitchSystemPrompt(
      `# Requirement Coverage\n| German | Must-have | Not evidenced | JD requires |\n|---|---|---|---|\n# Match Score Guidance\nRecommended match strength: 5/10`,
      fakeExcerpts
    );
    expect(pitch).toContain("# Practical Fit Risks");
    expect(pitch).toContain("spoken language");
    expect(pitch).toContain("employment type");
    expect(pitch).toContain("hybrid/office");
  });

  it("wording calibration rules are present in pitch prompt", () => {
    const pitch = buildRecruiterPitchSystemPrompt(
      "# Match Score Guidance\nRecommended match strength: 5/10",
      fakeExcerpts
    );
    expect(pitch).toContain("WORDING CALIBRATION");
    expect(pitch).toContain('Reserve "proven"');
  });

  it("No Preference Alignment shown when interest pack is absent", () => {
    const pitch = buildRecruiterPitchSystemPrompt(
      "# Match Score Guidance\nRecommended match strength: 5/10\nEvidence confidence: Medium",
      fakeExcerpts
    );
    expect(pitch).toContain(
      "CRITICAL: No interests or preference data was evaluated"
    );
    expect(pitch).toContain("Do **not** include a preference alignment score");
    expect(pitch).toContain(
      "Never mention interests, preference alignment, or a private preference pack"
    );
  });

  it("strong 8/10 pitch still requires Why Not Higher per output rules", () => {
    const pitch = buildRecruiterPitchSystemPrompt(
      `# Match Score Guidance\nRecommended match strength: 8/10\nEvidence confidence: High\nEvidence confidence reason: Most core requirements directly evidenced.\nReason: Strong fit\nScore caps applied: None`,
      fakeExcerpts
    );
    expect(pitch).toContain("# Why Not Higher?");
    expect(pitch).toContain("Y < 10");
    expect(pitch).toContain("Strong pursue");
    expect(pitch).toContain("TONE BY FIT");
    expect(pitch).toContain("residual validation points");
  });
});

describe("fiskaly regression: references Not Evidenced subsection", () => {
  it("renders Not Evidenced subsection with Golang and German gaps", () => {
    const items: ReferenceItem[] = [
      {
        claim: "Kafka event-driven orchestration",
        chunk: fakeKlarnaChunk,
        score: 0.65,
      },
    ];
    const gaps = [
      "Production Golang ownership",
      "Go runtime/concurrency optimization",
      "Database lock optimization",
      "Formal Staff-level RFC author/reviewer scope",
      "German fluency",
    ];
    const md = renderReferencesMarkdown(items, "en", gaps);
    expect(md).toContain("## Not Evidenced in Retrieved Portfolio Excerpts");
    expect(md).toContain("- Production Golang ownership");
    expect(md).toContain("- German fluency");
    expect(md).toContain("- Go runtime/concurrency optimization");
    expect(md).toContain("Support level: Strong");
  });

  it("gap items are plain bullets without vector match metadata", () => {
    const gaps = ["Production Golang ownership"];
    const md = renderReferencesMarkdown([], "en", gaps);
    const gapSection = md.split("## Not Evidenced")[1];
    expect(gapSection).toBeDefined();
    expect(gapSection).not.toContain("Source:");
    expect(gapSection).not.toContain("Support level:");
    expect(gapSection).not.toContain("Similarity");
  });

  it("positive claims still receive source references alongside gaps", () => {
    const items: ReferenceItem[] = [
      {
        claim: "Cross-functional delivery",
        chunk: fakeKlarnaChunk,
        score: 0.72,
      },
    ];
    const gaps = ["Go ownership"];
    const md = renderReferencesMarkdown(items, "en", gaps);
    expect(md).toContain("1. **Cross-functional delivery**");
    expect(md).toContain("Source:");
    expect(md).toContain("## Not Evidenced in Retrieved Portfolio Excerpts");
    expect(md).toContain("- Go ownership");
  });
});
