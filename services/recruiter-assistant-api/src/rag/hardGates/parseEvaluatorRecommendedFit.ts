import {
  type RecruiterNavLocale,
  RECRUITER_EVIDENCE_EVALUATOR_LABELS,
} from "../../constants.js";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Parses the evaluator's recommended match strength integer from localized markdown.
 */
export function parseEvaluatorRecommendedFit(
  evaluationMarkdown: string,
  navLocale: RecruiterNavLocale
): number | null {
  const label =
    RECRUITER_EVIDENCE_EVALUATOR_LABELS[navLocale]
      .recommendedMatchStrengthLabel;
  const pattern = new RegExp(
    `\\*\\*${escapeRegExp(label)}:\\*\\*\\s*(\\d{1,2})\\s*/\\s*10`,
    "i"
  );
  const match = evaluationMarkdown.match(pattern);
  if (!match) {
    const loose = new RegExp(
      `${escapeRegExp(label)}[:\\s]+(\\d{1,2})\\s*/\\s*10`,
      "i"
    );
    const looseMatch = evaluationMarkdown.match(loose);
    if (!looseMatch) return null;
    const score = Number.parseInt(looseMatch[1], 10);
    return Number.isFinite(score) && score >= 1 && score <= 10 ? score : null;
  }
  const score = Number.parseInt(match[1], 10);
  return Number.isFinite(score) && score >= 1 && score <= 10 ? score : null;
}
