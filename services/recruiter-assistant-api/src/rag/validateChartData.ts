import type { RecruiterNavLocale } from "../constants.js";
import {
  type CapabilityEvidenceLevel,
  type ChartData,
  type ChartRecommendation,
  chartDataSchema,
  type CapabilityDimension,
} from "./chartDataSchema.js";
import { logWarn } from "../logging/logger.js";
import type { HardGateAssessment } from "./hardGates/schema.js";
import { localizedRecommendationToKey } from "./hardGates/formatHardGateBlock.js";
import { parseEvaluatorMatchMetadata } from "./parseEvaluatorMatchMetadata.js";
import { parseEvaluatorRequirementEvidence } from "./parseEvaluatorRequirementEvidence.js";

export const CHART_VALIDATION_FAILURE_REASONS = [
  "schema_invalid",
  "duplicate_dimension_keys",
  "too_few_dimensions",
  "evidence_score_pairing_invalid",
  "evaluator_metadata_unparsed",
  "technical_fit_exceeds_ceiling",
  "technical_fit_drift",
  "evidence_confidence_mismatch",
  "recommendation_not_in_fit_band",
  "uniform_dimension_scores",
  "uniform_scores_with_mixed_evaluator_evidence",
  "all_dimension_scores_match_technical_fit",
] as const;

const MIN_DIMENSIONS_FOR_UNIFORM_SCORE_CHECK = 5;
const MIN_DIMENSIONS_FOR_TECHNICAL_FIT_MIRROR_CHECK = 4;

export type ChartValidationFailureReason =
  (typeof CHART_VALIDATION_FAILURE_REASONS)[number];

export type ChartValidationOutcome =
  | { readonly ok: true; readonly chart: ChartData }
  | {
      readonly ok: false;
      readonly reason: ChartValidationFailureReason;
      readonly detail?: string;
    };

/** Per-axis score bands aligned with chart projection prompt. */
export const CAPABILITY_EVIDENCE_SCORE_BANDS: Readonly<
  Record<
    CapabilityEvidenceLevel,
    { readonly min: number; readonly max: number }
  >
> = {
  direct: { min: 8, max: 10 },
  mixed: { min: 6, max: 8 },
  adjacent: { min: 4, max: 6 },
  not_evidenced: { min: 0, max: 3 },
};

export function clampCapabilityScoreForEvidence(
  evidenceLevel: CapabilityEvidenceLevel,
  score: number
): number {
  const { min, max } = CAPABILITY_EVIDENCE_SCORE_BANDS[evidenceLevel];
  return Math.min(max, Math.max(min, score));
}

/**
 * Clamps dimension scores into evidence bands when the model drifts slightly
 * (e.g. direct@7). Returns adjustment labels for operator logs.
 */
export function normalizeChartEvidenceScorePairings(chart: ChartData): {
  readonly chart: ChartData;
  readonly adjustments: readonly string[];
} {
  const adjustments: string[] = [];
  const capabilityDimensions = chart.capabilityDimensions.map((dim) => {
    const clampedScore = clampCapabilityScoreForEvidence(
      dim.evidenceLevel,
      dim.score
    );
    if (clampedScore === dim.score) {
      return dim;
    }
    adjustments.push(
      `${dim.key}:${dim.evidenceLevel}@${dim.score}->${clampedScore}`
    );
    return { ...dim, score: clampedScore };
  });
  return {
    chart: { ...chart, capabilityDimensions },
    adjustments,
  };
}

/** Allowed chart recommendations for evaluator technical-fit ceiling. */
export function allowedRecommendationsForFitCeiling(
  ceiling: number
): readonly ChartRecommendation[] {
  if (ceiling >= 9) {
    return ["Strong pursue", "Pursue"];
  }
  if (ceiling >= 8) {
    return ["Strong pursue", "Pursue"];
  }
  if (ceiling >= 7) {
    return ["Pursue", "Maybe / validate first"];
  }
  if (ceiling >= 5) {
    return ["Maybe / validate first", "Pursue", "Weak fit"];
  }
  if (ceiling >= 3) {
    return ["Weak fit", "Maybe / validate first", "Skip"];
  }
  return ["Weak fit", "Skip"];
}

function hasDuplicateDimensionKeys(
  dimensions: readonly CapabilityDimension[]
): boolean {
  const seen = new Set<string>();
  for (const dim of dimensions) {
    if (seen.has(dim.key)) return true;
    seen.add(dim.key);
  }
  return false;
}

function findInvalidEvidenceScorePairing(
  dimensions: readonly CapabilityDimension[]
): CapabilityDimension | null {
  for (const dim of dimensions) {
    const band = CAPABILITY_EVIDENCE_SCORE_BANDS[dim.evidenceLevel];
    if (dim.score < band.min || dim.score > band.max) {
      return dim;
    }
  }
  return null;
}

function allDimensionScoresIdentical(
  dimensions: readonly CapabilityDimension[]
): boolean {
  if (dimensions.length === 0) return false;
  const firstScore = dimensions[0].score;
  return dimensions.every((dim) => dim.score === firstScore);
}

function allDimensionScoresMatchTechnicalFit(
  dimensions: readonly CapabilityDimension[],
  technicalFit: number
): boolean {
  return (
    dimensions.length > 0 &&
    dimensions.every((dim) => dim.score === technicalFit)
  );
}

/**
 * Validates chart JSON against schema, dimension rules, and evaluator metadata.
 * Returns a failure reason when invalid (for operator logs).
 */
function resolveTechnicalFitCeiling(
  evaluatorCeiling: number | null,
  hardGateAssessment: HardGateAssessment | null | undefined
): number | null {
  if (hardGateAssessment) {
    const evaluatorCap = evaluatorCeiling ?? 10;
    return Math.min(evaluatorCap, hardGateAssessment.effectiveMaxTechnicalFit);
  }
  return evaluatorCeiling;
}

function isChartRecommendationAllowedByHardGates(
  recommendation: ChartRecommendation,
  assessment: HardGateAssessment
): boolean {
  const key = localizedRecommendationToKey(recommendation, "en");
  if (!key) return false;
  if (assessment.blockedRecommendations.includes(key)) return false;
  return assessment.allowedRecommendations.includes(key);
}

export function validateChartData(
  raw: unknown,
  evaluatorMarkdown: string,
  navLocale: RecruiterNavLocale,
  hardGateAssessment?: HardGateAssessment | null
): ChartValidationOutcome {
  const parsed = chartDataSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "schema_invalid",
      detail: parsed.error.issues[0]?.message,
    };
  }

  const chart = parsed.data;
  if (hasDuplicateDimensionKeys(chart.capabilityDimensions)) {
    return { ok: false, reason: "duplicate_dimension_keys" };
  }

  const uniqueKeys = new Set(chart.capabilityDimensions.map((d) => d.key));
  if (uniqueKeys.size < 4) {
    return {
      ok: false,
      reason: "too_few_dimensions",
      detail: `count=${uniqueKeys.size}`,
    };
  }

  const invalidPairing = findInvalidEvidenceScorePairing(
    chart.capabilityDimensions
  );
  if (invalidPairing) {
    return {
      ok: false,
      reason: "evidence_score_pairing_invalid",
      detail: `${invalidPairing.key}:${invalidPairing.evidenceLevel}@${invalidPairing.score}`,
    };
  }

  const evaluatorMeta = parseEvaluatorMatchMetadata(
    evaluatorMarkdown,
    navLocale
  );
  const { assessmentSummary } = chart;

  const technicalFitCeiling = resolveTechnicalFitCeiling(
    evaluatorMeta?.technicalFitCeiling ?? null,
    hardGateAssessment
  );

  if (!evaluatorMeta && !hardGateAssessment) {
    logWarn(
      "matchProfile",
      "evaluator metadata unparsed; structural chart checks only",
      {
        navLocale,
        chartTechnicalFit: assessmentSummary.technicalFit,
      }
    );
    return validateChartShapeWithoutEvaluatorMeta(
      chart,
      evaluatorMarkdown,
      navLocale
    );
  }

  if (technicalFitCeiling !== null) {
    if (assessmentSummary.technicalFit > technicalFitCeiling) {
      return {
        ok: false,
        reason: "technical_fit_exceeds_ceiling",
        detail: `chart=${assessmentSummary.technicalFit} ceiling=${technicalFitCeiling}`,
      };
    }
    const driftAnchor = hardGateAssessment
      ? hardGateAssessment.effectiveMaxTechnicalFit
      : evaluatorMeta!.technicalFitCeiling;
    if (Math.abs(assessmentSummary.technicalFit - driftAnchor) > 1) {
      return {
        ok: false,
        reason: "technical_fit_drift",
        detail: `chart=${assessmentSummary.technicalFit} ceiling=${driftAnchor}`,
      };
    }
  }

  if (
    evaluatorMeta &&
    assessmentSummary.evidenceConfidence !== evaluatorMeta.evidenceConfidence
  ) {
    return {
      ok: false,
      reason: "evidence_confidence_mismatch",
      detail: `chart=${assessmentSummary.evidenceConfidence} evaluator=${evaluatorMeta.evidenceConfidence}`,
    };
  }

  if (hardGateAssessment) {
    if (
      !isChartRecommendationAllowedByHardGates(
        assessmentSummary.recommendation,
        hardGateAssessment
      )
    ) {
      return {
        ok: false,
        reason: "recommendation_not_in_fit_band",
        detail: `recommendation=${assessmentSummary.recommendation} hardGateAllowed=${hardGateAssessment.allowedRecommendations.join(",")}`,
      };
    }
  } else if (evaluatorMeta) {
    const allowed = allowedRecommendationsForFitCeiling(
      evaluatorMeta.technicalFitCeiling
    );
    if (!allowed.includes(assessmentSummary.recommendation)) {
      return {
        ok: false,
        reason: "recommendation_not_in_fit_band",
        detail: `recommendation=${assessmentSummary.recommendation} allowed=${allowed.join(",")}`,
      };
    }
  }

  const requirementEvidence = parseEvaluatorRequirementEvidence(
    evaluatorMarkdown,
    navLocale
  );

  const dimensionCount = chart.capabilityDimensions.length;
  const scoresAreUniform = allDimensionScoresIdentical(
    chart.capabilityDimensions
  );

  if (
    scoresAreUniform &&
    dimensionCount >= MIN_DIMENSIONS_FOR_UNIFORM_SCORE_CHECK
  ) {
    return {
      ok: false,
      reason: "uniform_dimension_scores",
      detail: `count=${dimensionCount} score=${chart.capabilityDimensions[0]?.score}`,
    };
  }

  if (
    scoresAreUniform &&
    requirementEvidence?.hasMixedEvidenceLevels === true
  ) {
    return {
      ok: false,
      reason: "uniform_scores_with_mixed_evaluator_evidence",
      detail: `direct=${requirementEvidence.directCount} adjacent=${requirementEvidence.adjacentCount} not_evidenced=${requirementEvidence.notEvidencedCount}`,
    };
  }

  if (
    dimensionCount >= MIN_DIMENSIONS_FOR_TECHNICAL_FIT_MIRROR_CHECK &&
    allDimensionScoresMatchTechnicalFit(
      chart.capabilityDimensions,
      assessmentSummary.technicalFit
    )
  ) {
    return {
      ok: false,
      reason: "all_dimension_scores_match_technical_fit",
      detail: `technicalFit=${assessmentSummary.technicalFit} count=${dimensionCount}`,
    };
  }

  return { ok: true, chart };
}

/** When evaluator markdown cannot be parsed, still allow a structurally valid chart. */
function validateChartShapeWithoutEvaluatorMeta(
  chart: ChartData,
  evaluatorMarkdown: string,
  navLocale: RecruiterNavLocale
): ChartValidationOutcome {
  const requirementEvidence = parseEvaluatorRequirementEvidence(
    evaluatorMarkdown,
    navLocale
  );
  const dimensionCount = chart.capabilityDimensions.length;
  const scoresAreUniform = allDimensionScoresIdentical(
    chart.capabilityDimensions
  );

  if (
    scoresAreUniform &&
    dimensionCount >= MIN_DIMENSIONS_FOR_UNIFORM_SCORE_CHECK
  ) {
    return {
      ok: false,
      reason: "uniform_dimension_scores",
      detail: `count=${dimensionCount} score=${chart.capabilityDimensions[0]?.score}`,
    };
  }

  if (
    scoresAreUniform &&
    requirementEvidence?.hasMixedEvidenceLevels === true
  ) {
    return {
      ok: false,
      reason: "uniform_scores_with_mixed_evaluator_evidence",
      detail: `direct=${requirementEvidence.directCount} adjacent=${requirementEvidence.adjacentCount} not_evidenced=${requirementEvidence.notEvidencedCount}`,
    };
  }

  if (
    dimensionCount >= MIN_DIMENSIONS_FOR_TECHNICAL_FIT_MIRROR_CHECK &&
    allDimensionScoresMatchTechnicalFit(
      chart.capabilityDimensions,
      chart.assessmentSummary.technicalFit
    )
  ) {
    return {
      ok: false,
      reason: "all_dimension_scores_match_technical_fit",
      detail: `technicalFit=${chart.assessmentSummary.technicalFit} count=${dimensionCount}`,
    };
  }

  return {
    ok: true,
    chart,
  };
}

/**
 * Parses and validates chart JSON. Returns null when any check fails.
 */
export function parseAndValidateChartData(
  raw: unknown,
  evaluatorMarkdown: string,
  navLocale: RecruiterNavLocale,
  hardGateAssessment?: HardGateAssessment | null
): ChartData | null {
  const outcome = validateChartData(
    raw,
    evaluatorMarkdown,
    navLocale,
    hardGateAssessment
  );
  return outcome.ok ? outcome.chart : null;
}
