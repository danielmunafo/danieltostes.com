import type { HardGateAssessment, RecommendationLabel } from "./schema.js";

/**
 * Chooses the safest allowed recommendation when the pitch used a blocked label.
 */
export function getRecommendedReplacementRecommendation(
  assessment: HardGateAssessment
): RecommendationLabel {
  const { allowedRecommendations, reasons } = assessment;
  const hasFlexibility = reasons.some((row) => row.jdSuggestsFlexibility);

  if (hasFlexibility && allowedRecommendations.includes("maybe_validate")) {
    return "maybe_validate";
  }
  if (allowedRecommendations.includes("weak_fit")) {
    return "weak_fit";
  }
  if (allowedRecommendations.includes("skip")) {
    return "skip";
  }
  return allowedRecommendations[allowedRecommendations.length - 1] ?? "skip";
}
