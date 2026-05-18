import {
  CAPABILITY_DIMENSION_KEYS,
  CAPABILITY_DIMENSION_LABEL_MAX_LENGTH,
  CAPABILITY_DIMENSION_RATIONALE_MAX_LENGTH,
  CHART_EVIDENCE_CONFIDENCE,
  CHART_RECOMMENDATION,
} from "../../../rag/chartDataSchema.js";
import { getAgentInstruction } from "../../prompt/getAgentInstruction.js";

const CANONICAL_KEY_LIST = CAPABILITY_DIMENSION_KEYS.join(", ");

const CHART_PER_DIMENSION_WORKFLOW = `Per-dimension scoring workflow (mandatory — do this for EACH selected capability key):
1. Map the dimension to one or more rows in the evaluator requirement coverage table (and analyst themes only as context).
2. Set evidenceLevel from the **weakest decisive** mapped row (not_evidenced > adjacent > mixed > direct when rows disagree).
3. Pick score **inside** the band for that evidenceLevel. Use the full band — do not default every axis to the same integer.
4. Write rationale citing the mapped requirement row(s) and why that evidence level applies.
5. Never set a dimension score to assessmentSummary.technicalFit by default; overall fit is for the summary cards only.

Brevity (required — output must fit in one JSON object):
- label: max ${CAPABILITY_DIMENSION_LABEL_MAX_LENGTH} characters (short display name).
- rationale: max ${CAPABILITY_DIMENSION_RATIONALE_MAX_LENGTH} characters (one light, evidence-based sentence citing mapped requirement rows).
- Rationale tone: portfolio-assistant language, not hiring-decision language. Describe what was or was not found in the retrieved portfolio evidence; do not imply a final verdict about the candidate.
- Prefer phrases like "not found in the retrieved portfolio evidence", "not shown in the portfolio excerpts", or "not surfaced by the retrieved excerpts".
- Avoid judgmental/final-verdict phrases like "unproven", "failed to demonstrate", "weak candidate", "lacks", "insufficient", or "not qualified".
- Example rewrite: instead of "Senior engineering and communication are well supported, but the role's core interview-facilitation function and key practical engagement requirements remain unproven", write "Senior engineering and communication are well supported, but interview facilitation and practical engagement requirements were not found in the retrieved portfolio evidence".`;

const CHART_INSTRUCTIONS_BASE = getAgentInstruction(
  "agents/chart/chartInstructions.md"
);

export function buildChartProjectionSystemPrompt(compact = false): string {
  const compactAppendix = compact
    ? getAgentInstruction("agents/chart/chartInstructionsCompact.md")
    : "";

  return [
    CHART_INSTRUCTIONS_BASE,
    CHART_PER_DIMENSION_WORKFLOW,
    `Dimension selection (canonical keys): ${CANONICAL_KEY_LIST}`,
    `assessmentSummary must mirror evaluator match score guidance AND any backend hard gate block in the user prompt:
- technicalFit: integer ≤ effective max technical fit from hard gate block when present; otherwise same as evaluator recommended match strength (X in X/10)
- evidenceConfidence: one of ${CHART_EVIDENCE_CONFIDENCE.map((v) => `"${v}"`).join(", ")}
- recommendation: one of ${CHART_RECOMMENDATION.map((v) => `"${v}"`).join(", ")} — must be from Allowed recommendations in the hard gate block when present; never use Blocked recommendations`,
    compactAppendix,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildChartProjectionUserPrompt(
  jobDescriptionText: string,
  evaluatorMarkdown: string,
  analystMarkdown: string,
  hardGateBlock = ""
): string {
  const hardGateSection = hardGateBlock.trim()
    ? `---
Backend-enforced hard gate assessment (do not exceed; summary cards must comply):
${hardGateBlock.trim()}

`
    : "";

  return `Job description / recruiter message:
${jobDescriptionText}

---
Authoritative evaluator output:
${evaluatorMarkdown}

---
Analyst synthesis (context only; do not upgrade evidence):
${analystMarkdown}

${hardGateSection}Produce chart data: assessmentSummary + capabilityDimensions (canonical keys, target 6-8).
For each dimension: map requirement rows → evidenceLevel → score in band → rationale.
Vary scores across dimensions when the requirement table shows different evidence levels.
Assessment summary cards will be overwritten from the final pitch Scores section when the pitch is ready — stay consistent with hard gate caps now.`;
}
