import type { RecruiterNavLocale } from "../../constants.js";
import { computeHardGateAssessment } from "./computeHardGateAssessment.js";
import type { HardGateAssessment, HardGateRequirementRow } from "./schema.js";
import { parseEvaluatorRecommendedFit } from "./parseEvaluatorRecommendedFit.js";

/**
 * Runs deterministic assessment from extracted rows and evaluator markdown score.
 */
export function assessHardGates(
  rows: readonly HardGateRequirementRow[],
  evaluationMarkdown: string,
  navLocale: RecruiterNavLocale
): HardGateAssessment {
  const evaluatorRecommendedFit = parseEvaluatorRecommendedFit(
    evaluationMarkdown,
    navLocale
  );
  return computeHardGateAssessment(rows, evaluatorRecommendedFit);
}
