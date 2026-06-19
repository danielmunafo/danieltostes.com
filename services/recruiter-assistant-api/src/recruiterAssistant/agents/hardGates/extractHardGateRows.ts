import type { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import {
  CHAT_MODEL,
  HARD_GATE_EXTRACTION_MAX_TOKENS,
  type RecruiterNavLocale,
} from "../../../constants.js";
import { logWarn } from "../../../logging/logger.js";
import { traceGenerate } from "../../../tracing/requestTrace.js";
import { getAgentInstruction } from "../../prompt/getAgentInstruction.js";
import { parseEvaluatorTable } from "../../../rag/hardGates/parseEvaluatorTable.js";
import { hardGateExtractionSchema } from "../../../rag/hardGates/schema.js";
import type { HardGateRequirementRow } from "../../../rag/hardGates/schema.js";

type OpenAiClient = ReturnType<typeof createOpenAI>;

const EXTRACTION_SYSTEM = getAgentInstruction(
  "agents/hardGates/instructions.md"
);

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
    const { object } = await traceGenerate(
      "hard_gates",
      CHAT_MODEL,
      "chat",
      () =>
        generateObject({
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
        })
    );
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
