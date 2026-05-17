import {
  type RecruiterNavLocale,
  INTERESTS_OUTPUT_SKIP_SENTINEL,
  RECRUITER_INTERESTS_ALIGNMENT_LABELS,
  RECRUITER_NAV_LOCALE_WRITING_LABEL,
} from "../../../constants.js";
import { getAgentInstruction } from "../../prompt/getAgentInstruction.js";

const INTERESTS_STATIC_RULES = getAgentInstruction(
  "agents/interests/instructions.md"
);

const ADHERENCE_TOKEN_INSTRUCTION = `Use only these **Alignment** cell values (exact spelling):`;

/**
 * System prompt for the optional interests evaluator (preference fit vs private rubric).
 */
export function buildInterestsEvaluatorSystemPrompt(
  navLocale: RecruiterNavLocale
): string {
  const L = RECRUITER_INTERESTS_ALIGNMENT_LABELS[navLocale];
  const writing = RECRUITER_NAV_LOCALE_WRITING_LABEL[navLocale];
  const adherenceList = [
    L.termAligned,
    L.termDiscuss,
    L.termUnknown,
    L.termMisaligned,
    L.termDealbreaker,
  ].join(", ");

  return `${INTERESTS_STATIC_RULES}

Your job:
- For each **dimension explicitly implied by the rubric text**, infer what the JD states or signal **${L.termUnknown}** when the JD is silent. **${L.termUnknown}** is neutral — not a negative score by itself.
- Classify alignment per row using ${ADHERENCE_TOKEN_INSTRUCTION} ${adherenceList}.
- Use **${L.termDealbreaker}** only when the JD clearly contradicts a deal-breaker-level rule in the rubric (not for unknowns).
- Write every heading, table header, table row labels, and body line in **${writing}** only.

If **nothing** in the rubric can be assessed from the JD (no overlap, or the message is not substantive hiring context), output **only** this exact single line and nothing else:
${INTERESTS_OUTPUT_SKIP_SENTINEL}

Otherwise return concise markdown in this exact structure (use these \`#\` headings verbatim):

# ${L.headingPreferenceAlignment}

| ${L.tableColDimension} | ${L.tableColInferredFromJd} | ${L.tableColAlignment} | ${L.tableColNotes} |
|---|---|---|---|
| (one row per assessed dimension from the rubric only) | (short JD inference or "—") | (${adherenceList}) | (brief recruiter-safe note) |

# ${L.headingPreferenceDealbreakers}

Either bullet list of dealbreaker conflicts (professional wording) or this single line if none:
${L.noDealbreakersLine}

# ${L.headingPreferenceRecommendation}

On its own lines:
- **${L.preferenceScoreLinePrefix}:** X/10 (integer 1-10; use mid range when most dimensions are ${L.termUnknown}; lower when ${L.termMisaligned} or ${L.termDealbreaker} appear)
- **Summary:** 2-4 sentences; recruiter-safe; no verbatim private thresholds.

`;
}

/**
 * User turn: JD + criteria markdown from the loaded interests pack.
 */
export function buildInterestsEvaluatorUserPrompt(
  navLocale: RecruiterNavLocale,
  jobDescriptionText: string,
  criteriaMarkdown: string
): string {
  const L = RECRUITER_INTERESTS_ALIGNMENT_LABELS[navLocale];
  const headerRow = `| ${L.tableColDimension} | ${L.tableColInferredFromJd} | ${L.tableColAlignment} | ${L.tableColNotes} |`;
  return `Navigation locale: ${navLocale}

Private preference rubric (authoritative list of in-scope dimensions — evaluate **only** what appears here; omit rows for criteria not described):
---
${criteriaMarkdown.trim()}
---

Job description / recruiter message:
${jobDescriptionText.trim()}

Emit the table header row exactly once as:
${headerRow}`;
}
