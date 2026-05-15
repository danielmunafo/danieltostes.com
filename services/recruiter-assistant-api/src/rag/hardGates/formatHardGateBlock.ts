import {
  RECRUITER_RECOMMENDATION_LABELS,
  type RecruiterNavLocale,
} from "../../constants.js";
import type { HardGateAssessment } from "./schema.js";
import { RECOMMENDATION_LABELS, type RecommendationLabel } from "./schema.js";

const RECOMMENDATION_DISPLAY_EN: Record<RecommendationLabel, string> = {
  strong_pursue: "Strong pursue",
  pursue: "Pursue",
  maybe_validate: "Maybe / validate first",
  weak_fit: "Weak fit",
  skip: "Skip",
};

function formatEvidenceLevel(level: string): string {
  switch (level) {
    case "direct":
      return "Direct";
    case "adjacent":
      return "Adjacent";
    case "not_evidenced":
      return "Not evidenced";
    case "contradictory":
      return "Contradictory";
    default:
      return level;
  }
}

function formatRecommendationList(
  labels: readonly RecommendationLabel[]
): string {
  return labels.map((key) => RECOMMENDATION_DISPLAY_EN[key]).join(", ");
}

/**
 * Stable English block injected into analyst and pitch prompts (backend-enforced).
 */
export function formatHardGateAssessmentBlock(
  assessment: HardGateAssessment,
  _navLocale: RecruiterNavLocale = "en"
): string {
  const evaluatorLine =
    assessment.evaluatorRecommendedFit === null
      ? "- Evaluator recommended fit: (not parsed)"
      : assessment.evaluatorRecommendedFit > assessment.effectiveMaxTechnicalFit
        ? `- Evaluator recommended fit: ${assessment.evaluatorRecommendedFit}/10 (capped)`
        : `- Evaluator recommended fit: ${assessment.evaluatorRecommendedFit}/10`;

  const missingLines =
    assessment.reasons.length === 0
      ? "  - (none)"
      : assessment.reasons
          .map(
            (row) =>
              `  - ${row.requirement} (${row.category}): ${row.severity}, ${formatEvidenceLevel(row.evidenceLevel)}`
          )
          .join("\n");

  const blocked =
    assessment.blockedRecommendations.length === 0
      ? "(none)"
      : formatRecommendationList(assessment.blockedRecommendations);

  const allowed = formatRecommendationList(assessment.allowedRecommendations);

  return `Deterministic hard gate assessment (backend-enforced; do not exceed):
- Effective max technical fit: ${assessment.effectiveMaxTechnicalFit}/10
- Hard gate max technical fit: ${assessment.maxTechnicalFit}/10
${evaluatorLine}
- Blocked recommendations: ${blocked}
- Allowed recommendations: ${allowed}
- Rules fired: ${assessment.rulesFired.join(", ") || "none"}
- Missing gates:
${missingLines}
- Verdict caution required: ${assessment.shouldOpenVerdictWithCaution ? "yes" : "no"}`;
}

/** Maps canonical recommendation keys to localized pitch labels. */
export function recommendationKeyToLocalizedLabel(
  key: RecommendationLabel,
  navLocale: RecruiterNavLocale
): string {
  const labels = RECRUITER_RECOMMENDATION_LABELS[navLocale];
  const map: Record<RecommendationLabel, string> = {
    strong_pursue: labels.strongPursue,
    pursue: labels.pursue,
    maybe_validate: labels.maybeValidate,
    weak_fit: labels.weakFit,
    skip: labels.skip,
  };
  return map[key];
}

/** Resolves a localized pitch recommendation string to a canonical key, if recognized. */
export function localizedRecommendationToKey(
  localized: string,
  navLocale: RecruiterNavLocale
): RecommendationLabel | null {
  const trimmed = localized.trim();
  for (const key of RECOMMENDATION_LABELS) {
    if (recommendationKeyToLocalizedLabel(key, navLocale) === trimmed) {
      return key;
    }
  }
  return null;
}
