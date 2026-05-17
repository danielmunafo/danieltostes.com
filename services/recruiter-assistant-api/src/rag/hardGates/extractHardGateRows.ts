import type { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import {
  CHAT_MODEL,
  HARD_GATE_EXTRACTION_MAX_TOKENS,
  type RecruiterNavLocale,
} from "../../constants.js";
import { logWarn } from "../../logging/logger.js";
import { parseEvaluatorTable } from "./parseEvaluatorTable.js";
import { hardGateExtractionSchema } from "./schema.js";
import type { HardGateRequirementRow } from "./schema.js";

type OpenAiClient = ReturnType<typeof createOpenAI>;

const EXTRACTION_SYSTEM = `You extract hard-gate requirements from a job description and an evidence evaluator markdown report.

This is portfolio-evidence extraction, not a final hiring verdict. Identify hard gates strictly, but phrase missing evidence as retrieved portfolio-evidence gaps rather than candidate capability judgments.

Hard gates are mandatory, role-defining constraints when the JD marks them as required, mandatory, essential, must-have, non-negotiable, or clearly role-defining:
- spoken language fluency
- work authorization / visa / employment eligibility
- location / timezone / hybrid / onsite / travel
- employment type (e.g. full-time only, no freelancers)
- primary production language / framework / platform (e.g. production Golang when Go is central)
- specialist domain gates (ML validation, AI governance, data science training, people management)

Do not promote regular responsibilities, nice-to-haves, broad seniority expectations, generic collaboration skills, general ownership expectations, delivery style, agile practices, code review culture, testing habits, CI/CD practices, or DevOps mindset into hard gates unless the JD explicitly makes them mandatory, non-negotiable, or role-defining selection constraints.
Only emit rows where isHardGate is true OR the requirement is must-have and role-defining.
If a requirement is important for role fit but not a true hard gate, omit it from this extraction; it belongs in the regular evaluator output, not the hard-gate table.
Use English enum values only for category, evidenceLevel, requirementImportance.
Map evidence from the evaluator table — do not invent direct evidence.
Treat Adjacent like Not evidenced for hard-gate scoring, but preserve the original evaluator evidenceLevel value in the emitted row.
Set jdSuggestsFlexibility true only when the JD wording is clearly optional or flexible for that specific requirement (preferred, ideally, plus, nice to have, bonus, familiar with, exposure to, interest in, comfortable with, willing to learn).
Always include sourceRequirementText for every row. Use the exact JD wording when available; otherwise use an empty string. Do not omit the key.
When sourceRequirementText is empty or vague, prefer omitting the row unless the evaluator table contains an exact matching requirement.
`;

function buildExtractionPrompt(
  jobDescriptionText: string,
  evaluationMarkdown: string,
  navLocale: RecruiterNavLocale
): string {
  return `Navigation locale: ${navLocale}. Structure the evaluator's requirement coverage; do not re-evaluate portfolio excerpts or infer new evidence.

Job description:
${jobDescriptionText}

---
Evaluator markdown (authoritative for evidence levels):
${evaluationMarkdown}
`;
}

/**
 * Structured hard-gate row extraction via generateObject; falls back to table parsing.
 */
export async function extractHardGateRows(
  openai: OpenAiClient,
  navLocale: RecruiterNavLocale,
  jobDescriptionText: string,
  evaluationMarkdown: string
): Promise<HardGateRequirementRow[]> {
  try {
    const { object } = await generateObject({
      model: openai(CHAT_MODEL),
      schema: hardGateExtractionSchema,
      system: EXTRACTION_SYSTEM,
      prompt: buildExtractionPrompt(
        jobDescriptionText,
        evaluationMarkdown,
        navLocale
      ),
      temperature: 0,
      maxTokens: HARD_GATE_EXTRACTION_MAX_TOKENS,
    });
    const rows = object.rows
      .filter((row) => row.isHardGate)
      .map((row) => ({
        ...row,
        sourceRequirementText: (row.sourceRequirementText ?? "").trim(),
      }));
    if (rows.length > 0) {
      return rows;
    }

    logWarn(
      "hardGates",
      "structured extraction returned no rows; using table parser",
      {
        navLocale,
      }
    );
  } catch (err) {
    logWarn("hardGates", "structured extraction failed; using table parser", {
      err,
      navLocale,
    });
  }

  return parseEvaluatorTable(evaluationMarkdown, navLocale);
}
