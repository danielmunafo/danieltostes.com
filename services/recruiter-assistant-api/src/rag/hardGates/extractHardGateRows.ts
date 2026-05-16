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

Hard gates are mandatory, role-defining constraints when the JD marks them as required, mandatory, essential, must-have, non-negotiable, or clearly role-defining:
- spoken language fluency
- work authorization / visa / employment eligibility
- location / timezone / hybrid / onsite / travel
- employment type (e.g. full-time only, no freelancers)
- primary production language / framework / platform (e.g. production Golang when Go is central)
- specialist domain gates (ML validation, AI governance, data science training, people management)

Only emit rows where isHardGate is true OR the requirement is must-have and role-defining.
Use English enum values only for category, evidenceLevel, requirementImportance.
Map evidence from the evaluator table — do not invent direct evidence.
Treat Adjacent like Not evidenced for hard gates.
Set jdSuggestsFlexibility true only when the JD wording is clearly optional (preferred, ideally, plus, nice to have) for that specific requirement.
Include sourceRequirementText when available from the JD.`;

function buildExtractionPrompt(
  jobDescriptionText: string,
  evaluationMarkdown: string,
  navLocale: RecruiterNavLocale
): string {
  return `Navigation locale: ${navLocale}. Structure the evaluator's requirement coverage; do not re-evaluate portfolio excerpts.

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
      .map((row) => {
        const trimmed = row.sourceRequirementText.trim();
        if (trimmed.length < 2) {
          const { sourceRequirementText: _unused, ...rest } = row;
          void _unused;
          return rest as HardGateRequirementRow;
        }
        return { ...row, sourceRequirementText: trimmed };
      });
    if (rows.length > 0) {
      return rows;
    }
  } catch (err) {
    logWarn("hardGates", "structured extraction failed; using table parser", {
      err,
      navLocale,
    });
  }

  return parseEvaluatorTable(evaluationMarkdown, navLocale);
}
