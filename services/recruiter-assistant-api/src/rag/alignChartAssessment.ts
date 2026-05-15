import type { RecruiterNavLocale } from "../constants.js";
import type { ChartData, ChartRecommendation } from "./chartDataSchema.js";
import { localizedRecommendationToKey } from "./hardGates/formatHardGateBlock.js";
import { getRecommendedReplacementRecommendation } from "./hardGates/getRecommendedReplacementRecommendation.js";
import type {
  HardGateAssessment,
  RecommendationLabel,
} from "./hardGates/schema.js";
import { logInfo } from "../logging/logger.js";
import { parsePitchAssessmentSummary } from "./parsePitchAssessmentSummary.js";

function recommendationKeyToChartLabel(
  key: RecommendationLabel
): ChartRecommendation {
  const map: Record<RecommendationLabel, ChartRecommendation> = {
    strong_pursue: "Strong pursue",
    pursue: "Pursue",
    maybe_validate: "Maybe / validate first",
    weak_fit: "Weak fit",
    skip: "Skip",
  };
  return map[key];
}

function chartRecommendationToKey(
  recommendation: ChartRecommendation
): RecommendationLabel | null {
  return localizedRecommendationToKey(recommendation, "en");
}

export type ChartAssessmentAlignmentResult = {
  readonly chart: ChartData;
  readonly adjusted: boolean;
  readonly fields: readonly string[];
};

/**
 * Clamps chart assessment summary to backend hard-gate caps before pitch is available.
 */
export function alignChartAssessmentWithHardGates(
  chart: ChartData,
  assessment: HardGateAssessment
): ChartAssessmentAlignmentResult {
  const fields: string[] = [];
  let { assessmentSummary } = chart;

  if (assessmentSummary.technicalFit > assessment.effectiveMaxTechnicalFit) {
    assessmentSummary = {
      ...assessmentSummary,
      technicalFit: assessment.effectiveMaxTechnicalFit,
    };
    fields.push(
      `technicalFit->${assessment.effectiveMaxTechnicalFit}(hardGateCap)`
    );
  }

  const recKey = chartRecommendationToKey(assessmentSummary.recommendation);
  const isBlocked =
    recKey !== null && assessment.blockedRecommendations.includes(recKey);
  const isDisallowed =
    recKey !== null && !assessment.allowedRecommendations.includes(recKey);

  if (isBlocked || isDisallowed) {
    const replacement = getRecommendedReplacementRecommendation(assessment);
    assessmentSummary = {
      ...assessmentSummary,
      recommendation: recommendationKeyToChartLabel(replacement),
    };
    fields.push(`recommendation->${replacement}(hardGate)`);
  }

  if (fields.length === 0) {
    return { chart, adjusted: false, fields: [] };
  }

  return {
    chart: { ...chart, assessmentSummary },
    adjusted: true,
    fields,
  };
}

/**
 * Overwrites chart assessment summary with the pitch `# Scores` section (post-clamp).
 * Pitch scores are the source of truth for summary cards vs the radar chart.
 */
export function alignChartAssessmentWithPitch(
  chart: ChartData,
  assistantText: string,
  navLocale: RecruiterNavLocale
): ChartAssessmentAlignmentResult {
  const pitchSummary = parsePitchAssessmentSummary(assistantText, navLocale);
  if (!pitchSummary) {
    return { chart, adjusted: false, fields: [] };
  }

  const fields: string[] = [];
  const { assessmentSummary } = chart;

  if (assessmentSummary.technicalFit !== pitchSummary.technicalFit) {
    fields.push(
      `technicalFit:${assessmentSummary.technicalFit}->${pitchSummary.technicalFit}(pitch)`
    );
  }
  if (
    assessmentSummary.evidenceConfidence !== pitchSummary.evidenceConfidence
  ) {
    fields.push(
      `evidenceConfidence:${assessmentSummary.evidenceConfidence}->${pitchSummary.evidenceConfidence}(pitch)`
    );
  }
  if (assessmentSummary.recommendation !== pitchSummary.recommendation) {
    fields.push(
      `recommendation:${assessmentSummary.recommendation}->${pitchSummary.recommendation}(pitch)`
    );
  }

  if (fields.length === 0) {
    return { chart, adjusted: false, fields: [] };
  }

  return {
    chart: { ...chart, assessmentSummary: pitchSummary },
    adjusted: true,
    fields,
  };
}

export function logChartAssessmentAlignment(
  source: "hardGate" | "pitch",
  navLocale: RecruiterNavLocale,
  fields: readonly string[]
): void {
  if (fields.length === 0) return;
  logInfo("chartAssessmentSync", "chart assessment summary aligned", {
    navLocale,
    source,
    fields: fields.join(", "),
  });
}
