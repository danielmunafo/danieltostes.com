import { REFERENCE_MAX_CLAIMS } from "../../../constants.js";
import { getAgentInstruction } from "../../prompt/getAgentInstruction.js";

const CLAIM_EXTRACTION_STATIC = getAgentInstruction(
  "agents/references/claimExtractionInstructions.md"
);

export function buildClaimExtractionPrompt(assistantText: string): string {
  return `${CLAIM_EXTRACTION_STATIC}

Constraints:
- Always return both top-level arrays: \`claims\` and \`gaps\`. Use an empty array when there are no important gaps.
- Return at most ${REFERENCE_MAX_CLAIMS} claims and at most ${REFERENCE_MAX_CLAIMS} gaps.
- One factual unit per entry, short and self-contained; use light evidence-assistant wording.
- Use the language of the assessment.

Assessment:
---
${assistantText}
---`;
}

/** Exported for unit tests only. */
export function buildClaimExtractionPromptForTest(
  assistantText: string
): string {
  return buildClaimExtractionPrompt(assistantText);
}
