import {
  CAPABILITY_DIMENSION_KEYS,
  CAPABILITY_DIMENSION_LABEL_MAX_LENGTH,
  CAPABILITY_DIMENSION_RATIONALE_MAX_LENGTH,
  CHART_EVIDENCE_CONFIDENCE,
  CHART_RECOMMENDATION,
} from "./chartDataSchema.js";

const CANONICAL_KEY_LIST = CAPABILITY_DIMENSION_KEYS.join(", ");

const PER_DIMENSION_WORKFLOW = `Per-dimension scoring workflow (mandatory — do this for EACH selected capability key):
1. Map the dimension to one or more rows in the evaluator requirement coverage table (and analyst themes only as context).
2. Set evidenceLevel from the **weakest decisive** mapped row (not_evidenced > adjacent > mixed > direct when rows disagree).
3. Pick score **inside** the band for that evidenceLevel. Use the full band — do not default every axis to the same integer.
4. Write rationale citing the mapped requirement row(s) and why that evidence level applies.
5. Never set a dimension score to assessmentSummary.technicalFit by default; overall fit is for the summary cards only.

Brevity (required — output must fit in one JSON object):
- label: max ${CAPABILITY_DIMENSION_LABEL_MAX_LENGTH} characters (short display name).
- rationale: max ${CAPABILITY_DIMENSION_RATIONALE_MAX_LENGTH} characters (one tight sentence citing mapped requirement rows).`;

const CHART_PROJECTION_COMPACT_APPENDIX = `

COMPACT MODE: Prior response was truncated. Use 6-8 dimensions only. Labels ≤40 chars. Rationales ≤90 chars (single sentence). No prose.`;

export function buildChartProjectionSystemPrompt(compact = false): string {
  return `You convert evaluator and analyst conclusions into chart-ready JSON. You are NOT re-running a full candidate evaluation — you ARE scoring each capability axis independently from mapped requirement rows.

The evaluator is authoritative for:
- technical fit (recommended match strength) — summary cards only
- evidence confidence
- recommendation (derive from fit + confidence + gaps; stay consistent with evaluator tone)
- direct / adjacent / not-evidenced classifications per requirement row
- major risks and score caps
- not-evidenced classifications

The analyst is synthesis context only. Never use the analyst to upgrade evidence beyond the evaluator.

${PER_DIMENSION_WORKFLOW}

Dimension selection:
- Use canonical dimension keys only: ${CANONICAL_KEY_LIST}
- Select 4-10 dimensions; **target 6-8** that matter for this JD.
- Omit dimensions irrelevant to the role (do not score them low).
- Include role-critical gaps even when other axes are strong.
- Do **not** include all 10 keys unless the JD genuinely spans every capability area.

Hard rules:
- Do not create more optimistic scores than mapped evaluator rows support.
- Do not turn adjacent evidence into direct evidence.
- Do not invent missing skills.
- Do not override score caps, risk severity, or not-evidenced classifications.
- Do not copy assessmentSummary.technicalFit onto every capability dimension.
- When the requirement table has mixed evidence levels, capability scores **must differ** across dimensions (shape the radar).
- When most mapped rows for a dimension are direct, prefer 8-9 rather than always 10 unless excerpts are exceptional.
- Do not downgrade strong broad matches because of minor missing examples on unrelated axes.

Capability score mapping (per dimension, from mapped rows):
| Evidence level | Score band |
| direct | 8-10 (use 8 vs 9 vs 10 by strength of mapped rows; avoid all 10s unless every mapped row is clearly exceptional) |
| mixed | 6-8 |
| adjacent | 4-6 |
| not_evidenced | 0-3 (0-1 if irrelevant; 2-3 if role-critical gap) |

assessmentSummary must mirror evaluator match score guidance AND any backend hard gate block in the user prompt:
- technicalFit: integer ≤ effective max technical fit from hard gate block when present; otherwise same as evaluator recommended match strength (X in X/10)
- evidenceConfidence: one of ${CHART_EVIDENCE_CONFIDENCE.map((v) => `"${v}"`).join(", ")}
- recommendation: one of ${CHART_RECOMMENDATION.map((v) => `"${v}"`).join(", ")} — must be from Allowed recommendations in the hard gate block when present; never use Blocked recommendations

Output only structured data matching the schema.${compact ? CHART_PROJECTION_COMPACT_APPENDIX : ""}`;
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
