import { describe, expect, it } from "vitest";
import {
  buildEvidenceAnalystSystemPrompt,
  buildEvidenceAnalystUserPrompt,
  buildRecruiterPitchSystemPrompt,
  formatPortfolioChunks,
} from "../src/rag/prompt.js";
import {
  buildEvidenceEvaluatorSystemPrompt,
  buildEvidenceEvaluatorUserPrompt,
  EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN,
} from "../src/rag/evaluatorPrompt.js";
import type { EmbeddingChunk } from "../src/rag/retrieve.js";

describe("formatPortfolioChunks", () => {
  it("formats chunk with category and title prominently", () => {
    const chunks: EmbeddingChunk[] = [
      {
        id: "1",
        text: "Evidence about distributed systems",
        embedding: [],
        metadata: {
          locale: "en",
          title: "Distributed Systems",
          category: "distributed-systems",
        },
      },
      { id: "2", text: "World", embedding: [] },
    ];
    const out = formatPortfolioChunks(chunks);
    expect(out).toContain(
      "### Source 1: [distributed-systems] Distributed Systems"
    );
    expect(out).toContain("Evidence about distributed systems");
    expect(out).toContain("### Source 2");
    expect(out).toContain("World");
  });

  it("uses localized excerpt source label for pt-BR", () => {
    const chunks: EmbeddingChunk[] = [
      {
        id: "1",
        text: "Trecho",
        embedding: [],
        metadata: { title: "Projeto" },
      },
    ];
    const out = formatPortfolioChunks(chunks, "pt-BR");
    expect(out).toContain("### Fonte 1: Projeto");
    expect(out).toContain("Trecho");
  });

  it("formats chunk with title but no category", () => {
    const chunks: EmbeddingChunk[] = [
      {
        id: "1",
        text: "Role info",
        embedding: [],
        metadata: { title: "Klarna" },
      },
    ];
    const out = formatPortfolioChunks(chunks);
    expect(out).toContain("### Source 1: Klarna");
    expect(out).toContain("Role info");
  });
});

describe("buildEvidenceEvaluatorSystemPrompt", () => {
  it("includes requirement table with importance and hard-cap rules", () => {
    const s = buildEvidenceEvaluatorSystemPrompt("en");
    expect(s).toContain("# Requirement Coverage");
    expect(s).toContain("| Importance |");
    expect(s).toContain("Must-have");
    expect(s).toContain("Contradictory");
    expect(s).toContain("# Match Score Guidance");
    expect(s).toContain("Evidence confidence");
    expect(s).toContain(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN.slice(0, 80));
    expect(s).toContain("GitHub-flavored markdown");
  });

  it("uses localized evaluator headings for pt-BR", () => {
    const s = buildEvidenceEvaluatorSystemPrompt("pt-BR");
    expect(s).toContain("# Cobertura dos requisitos");
    expect(s).toContain("| Importância |");
    expect(s).toContain("# Orientação de pontuação de aderência");
  });

  it("embeds stricter direct vs adjacent examples in English cap rules", () => {
    expect(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN).toContain(
      "Stricter **Direct**"
    );
    expect(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN).toContain("Temporal");
    expect(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN).toContain(
      "IAM / policy-driven"
    );
    expect(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN).toContain("Gap severity");
    expect(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN).toContain(
      "Positive-match calibration"
    );
    expect(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN).toContain(
      "Principal / staff full-stack role with a role-defining expert legacy stack band"
    );
    expect(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN).toContain(
      "Exception — stack band vs general role shape"
    );
    expect(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN).toContain(
      "Two or more role-defining hard gates"
    );
    expect(EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN).toContain(
      "required spoken language fluency"
    );
  });

  it("evidence confidence rubric allows Medium when strong evidence exists for some must-haves", () => {
    const s = buildEvidenceEvaluatorSystemPrompt("en");
    expect(s).toContain("several important areas");
    expect(s).toContain("A mix of strong evidence and meaningful gaps");
    expect(s).toContain("**Medium**");
  });

  it("evidence confidence Low rubric requires majority of must-haves missing, not just some", () => {
    const s = buildEvidenceEvaluatorSystemPrompt("en");
    expect(s).toContain("majority");
    expect(s).toContain(
      "Do **not** use **Low** when strong direct evidence exists for several must-have requirements"
    );
  });

  it("instructs evaluator to re-check scores when likely over-penalizing", () => {
    const s = buildEvidenceEvaluatorSystemPrompt("en");
    expect(s).toContain("over-penalizing");
    expect(s).toContain("raise to **8**");
  });

  it("instructs evaluator to split bundled requirements into atomic rows", () => {
    const s = buildEvidenceEvaluatorSystemPrompt("en");
    expect(s).toContain("Split **distinct** requirements into separate rows");
    expect(s).toContain("different evidence levels");
    expect(s).toContain("numeric tenure thresholds");
    expect(s).not.toContain("prefer a shorter table over an abandoned mid-row");
  });
});

describe("buildEvidenceAnalystSystemPrompt", () => {
  it("asks for structured synthesis brief without requirement coverage heading", () => {
    const s = buildEvidenceAnalystSystemPrompt("en");
    expect(s).toContain("talent intelligence system");
    expect(s).toContain("# High-Signal Matches");
    expect(s).not.toContain("# Requirement Coverage\n\nBefore high-signal");
    expect(s).toContain("# Potential Concerns or Missing Evidence");
    expect(s).toContain("# Off-topic input");
  });

  it("instructs analyst to align with evaluator classifications", () => {
    const s = buildEvidenceAnalystSystemPrompt("en");
    expect(s).toContain("authoritative");
    expect(s).toContain("never upgrade adjacent to direct");
  });

  it("uses Portuguese markdown headings for pt-BR", () => {
    const s = buildEvidenceAnalystSystemPrompt("pt-BR");
    expect(s).toContain("# Resumo de alinhamento do candidato");
    expect(s).toContain("# Correspondências de alto sinal");
    expect(s).not.toContain("# Cobertura dos requisitos\n\nBefore high-signal");
  });

  it("includes negative reciprocal mismatch rules", () => {
    const s = buildEvidenceAnalystSystemPrompt("en");
    expect(s).toContain("negative reciprocal");
    expect(s).toContain(
      "Building AI-enabled applications is NOT the same as validating ML models"
    );
    expect(s).toContain("adjacent experience as direct evidence");
    expect(s).toContain("Legacy modernization");
  });

  it("states navigation locale in instructions for pt-BR", () => {
    const s = buildEvidenceAnalystSystemPrompt("pt-BR");
    expect(s).toContain("The visitor's navigation locale is **pt-BR**");
    expect(s).toContain("**Brazilian Portuguese**");
  });
});

describe("buildEvidenceAnalystUserPrompt", () => {
  it("embeds authoritative evaluation and omits requirement heading list", () => {
    const u = buildEvidenceAnalystUserPrompt(
      "en",
      "Role: engineer",
      "### Source 1\nx",
      "# Requirement Coverage\n| a | b |"
    );
    expect(u).toContain("Navigation locale: en");
    expect(u).toContain("# Candidate Alignment Summary");
    expect(u).toContain("that section belongs to the evaluator only");
    expect(u).toContain("Authoritative requirement evaluation");
    expect(u).toContain("| a | b |");
  });

  it("repeats required pt-BR headings without Cobertura dos requisitos in required list", () => {
    const u = buildEvidenceAnalystUserPrompt(
      "pt-BR",
      "Vaga: engenheiro",
      "### Fonte 1\nx",
      "# Cobertura dos requisitos\nok"
    );
    expect(u).toContain("Navigation locale: pt-BR");
    expect(u).toContain("# Resumo de alinhamento do candidato");
    expect(u).not.toContain(
      "Required `#` heading lines\n# Cobertura dos requisitos"
    );
    expect(u).toContain("Direto, Adjacente, Não evidenciado, Contraditório");
  });
});

describe("buildRecruiterPitchSystemPrompt", () => {
  it("includes brief, excerpts, executive brief headings, and match ceiling language", () => {
    const brief = "## Alignment\n- x";
    const excerpts = "### Source 1\ny";
    const s = buildRecruiterPitchSystemPrompt(brief, excerpts);
    expect(s).toContain("Evidence Brief:");
    expect(s).toContain(brief);
    expect(s).toContain("Retrieved Excerpts:");
    expect(s).toContain(excerpts);
    expect(s).toContain("# Verdict");
    expect(s).toContain("# Scores");
    expect(s).toContain("# Why It Matches");
    expect(s).toContain("# Main Risks");
    expect(s).toContain("# Recommended Interview Focus");
    expect(s).toContain("# Best Positioning Angle");
    expect(s).toContain("Effective max technical fit");
    expect(s).toContain("Maybe / validate first");
    expect(s).toContain("AI-assisted **technical candidate evaluation**");
    expect(s).not.toContain("## Match Strength");
  });

  it("includes evidence confidence tokens and deduplication rules", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("Evidence confidence");
    expect(s).toContain("DEDUPLICATION");
    expect(s).toContain("High");
    expect(s).toContain("Medium");
    expect(s).toContain("Low");
  });

  it("omits preference alignment when brief has no Preference Alignment heading", () => {
    const brief =
      "# Match Score Guidance\nRecommended match strength: 5/10\nEvidence confidence: Medium";
    const s = buildRecruiterPitchSystemPrompt(brief, "excerpts");
    expect(s).toContain("Do **not** include a preference alignment score");
    expect(s).toContain(
      "CRITICAL: No interests or preference data was evaluated"
    );
    expect(s).not.toContain("Preference alignment: Z/10");
  });

  it("mentions preference block when brief includes Preference Alignment heading", () => {
    const withPref = ["# Preference Alignment\n|a|", "eval"].join("\n");
    const s = buildRecruiterPitchSystemPrompt(withPref, "excerpts");
    expect(s).toContain("Preference alignment");
    expect(s).not.toContain("CRITICAL: No interests or preference data");
  });

  it("includes Why Not Higher whenever Technical fit is below 10", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("# Why Not Higher?");
    expect(s).toContain("Y < 10");
    expect(s).toContain("Omit this heading only when Y = 10");
  });

  it("does not omit Why Not Higher for strong 8/10 fits", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).not.toContain("only if Technical fit ≤ 7");
    expect(s).toContain("For **8** or **9**");
  });

  it("includes Practical Fit Risks section instruction for JD constraints", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("# Practical Fit Risks");
    expect(s).toContain("spoken language");
    expect(s).toContain("employment type");
    expect(s).toContain("location/timezone");
    expect(s).toContain("contractor rate");
    expect(s).toContain("Do **not** claim the portfolio shows");
  });

  it("Practical Fit Risks does not invent personal preferences", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("Do not infer Daniel's personal preferences");
    expect(s).toContain("Never mention interests, preference alignment");
  });

  it("includes wording calibration against overstating 'proven'", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("WORDING CALIBRATION");
    expect(s).toContain('Reserve "proven"');
    expect(s).toContain("evidence of");
    expect(s).toContain("signals of");
    expect(s).toContain("strong indication of");
  });

  it("caps Why It Matches, Main Risks, and Interview Focus bullet counts", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("**3-4** bullets max");
    expect((s.match(/\*\*4-5\*\* bullets max/g) ?? []).length).toBe(2);
  });

  it("includes tone guidance for strong vs weak recommendations", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("TONE BY FIT");
    expect(s).toContain("Strong pursue");
    expect(s).toContain("residual validation points");
  });

  it("includes scoring calibration against over-penalizing minor gaps", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("SCORING CALIBRATION");
    expect(s).toContain("at least 8/10");
    expect(s).toContain("**7/10** mainly");
    expect(s).toContain("Dual-lens principal full-stack");
  });

  it("requires Main Risks bullets to use localized severity prefixes", () => {
    const s = buildRecruiterPitchSystemPrompt(
      "brief",
      "excerpts",
      "English",
      "en"
    );
    expect(s).toContain("**Major:**");
    expect(s).toContain("**Moderate:**");
    expect(s).toContain("**Minor:**");
    expect(s).toContain("**Minor-to-moderate:**");
  });

  it("uses Portuguese risk severity labels for pt-BR pitch", () => {
    const s = buildRecruiterPitchSystemPrompt(
      "brief",
      "excerpts",
      "Brazilian Portuguese",
      "pt-BR"
    );
    expect(s).toContain("**Moderada:**");
    expect(s).toContain("**Menor a moderada:**");
  });

  it("instructs verdict to lead with fit for 8-9 technical scores", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("validation points**, not blockers");
    expect(s).toContain("split-lens");
  });

  it("uses localized headings and recommendation labels for pt-BR", () => {
    const s = buildRecruiterPitchSystemPrompt(
      "brief",
      "excerpts",
      "Brazilian Portuguese",
      "pt-BR"
    );
    expect(s).toContain("# Veredito");
    expect(s).toContain("Talvez / validar antes");
    expect(s).not.toContain("## Força da aderência");
    expect(s).toContain("Não evidenciado");
  });

  it("uses Portuguese portfolio language label for pt-BR", () => {
    const s = buildRecruiterPitchSystemPrompt(
      "brief",
      "excerpts",
      "Brazilian Portuguese",
      "pt-BR"
    );
    expect(s).toContain("**Brazilian Portuguese**");
  });

  it("injects portfolio writing language when provided", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts", "Spanish");
    expect(s).toContain("**Spanish**");
    expect(s).toContain("Do not switch languages");
  });

  it("includes hard must-have override for transferability vs role viability", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("HARD MUST-HAVE OVERRIDE");
    expect(s).toContain("technical transferability");
    expect(s).toContain("role viability");
    expect(s).toContain("spoken language fluency");
    expect(s).toContain("named primary production language");
  });

  it("caps technical fit when multiple hard gates are missing", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("≤ 5/10");
    expect(s).toContain("≤ 6/10");
    expect(s).toContain("4/10 or lower");
    expect(s).toContain("German + Golang");
  });

  it("forbids Pursue when multiple hard gates or language plus stack are missing", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain(
      "Do **not** output **Strong pursue** or **Pursue** when **multiple**"
    );
    expect(s).toContain("required spoken language or other practical gate");
    expect(s).toContain("not** a strong match for the role **as written**");
  });

  it("labels mandatory language and stack gaps as Major in Main Risks", () => {
    const s = buildRecruiterPitchSystemPrompt("brief", "excerpts");
    expect(s).toContain("required spoken language fluency");
    expect(s).toContain("primary production stack");
    expect(s).toContain("do **not** soften these into **Moderate:**");
  });
});

describe("buildEvidenceEvaluatorUserPrompt", () => {
  it("pins localized table header and match guidance heading for en", () => {
    const u = buildEvidenceEvaluatorUserPrompt(
      "en",
      "JD line",
      "### Source 1\nexcerpt"
    );
    expect(u).toContain(
      "| Requirement | Importance | Evidence Level | Notes |"
    );
    expect(u).toContain("# Match Score Guidance");
    expect(u).toContain("Evidence confidence");
    expect(u).toContain("Must-have, Nice-to-have");
    expect(u).toContain("valid** GFM");
  });
});
