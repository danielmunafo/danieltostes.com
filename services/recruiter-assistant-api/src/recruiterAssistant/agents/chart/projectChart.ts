import { generateObject } from "ai";
import {
  CHAT_MODEL,
  DIMENSION_SCORING_COMPACT_MAX_TOKENS,
  DIMENSION_SCORING_MAX_TOKENS,
  type RecruiterNavLocale,
} from "../../../constants.js";
import { logError, logInfo, logWarn } from "../../../logging/logger.js";
import { runModelStage } from "../../../reliability/withReliability.js";
import {
  alignChartAssessmentWithHardGates,
  logChartAssessmentAlignment,
} from "../../../rag/alignChartAssessment.js";
import {
  chartDataSchemaForModelOutput,
  type ChartData,
} from "../../../rag/chartDataSchema.js";
import type { HardGateAssessment } from "../../../rag/hardGates/index.js";
import {
  normalizeChartEvidenceScorePairings,
  validateChartData,
} from "../../../rag/validateChartData.js";
import type { OpenAiProvider } from "../../types.js";
import {
  buildChartProjectionSystemPrompt,
  buildChartProjectionUserPrompt,
} from "./assembleChartPrompt.js";

const CHART_PROJECTION_ATTEMPTS = [
  {
    label: "full",
    compact: false,
    maxTokens: DIMENSION_SCORING_MAX_TOKENS,
  },
  {
    label: "compact",
    compact: true,
    maxTokens: DIMENSION_SCORING_COMPACT_MAX_TOKENS,
  },
] as const;

export async function projectChart(params: {
  openai: OpenAiProvider;
  navLocale: RecruiterNavLocale;
  userText: string;
  evidenceEvaluationMarkdown: string;
  evidenceAnalysisMarkdown: string;
  hardGateAssessmentMarkdown: string;
  hardGateAssessment: HardGateAssessment | null;
}): Promise<ChartData | null> {
  const prompt = buildChartProjectionUserPrompt(
    params.userText,
    params.evidenceEvaluationMarkdown,
    params.evidenceAnalysisMarkdown,
    params.hardGateAssessmentMarkdown
  );

  logInfo("matchProfile", "chart projection starting", {
    navLocale: params.navLocale,
  });

  for (const [attemptIndex, attempt] of CHART_PROJECTION_ATTEMPTS.entries()) {
    try {
      const { object: rawChart } = await runModelStage(
        "chart",
        "chat",
        CHAT_MODEL,
        ({ abortSignal, maxRetries }) =>
          generateObject({
            model: params.openai(CHAT_MODEL),
            schema: chartDataSchemaForModelOutput,
            maxTokens: attempt.maxTokens,
            system: buildChartProjectionSystemPrompt(attempt.compact),
            prompt,
            abortSignal,
            maxRetries,
          })
      );
      const { chart: chartForValidation, adjustments } =
        normalizeChartEvidenceScorePairings(rawChart);
      if (adjustments.length > 0) {
        logWarn("matchProfile", "chart evidence-score pairings normalized", {
          navLocale: params.navLocale,
          attempt: attemptIndex + 1,
          adjustments: adjustments.join(", "),
        });
      }
      let chartCandidate = chartForValidation;
      if (params.hardGateAssessment) {
        const hardGateAligned = alignChartAssessmentWithHardGates(
          chartCandidate,
          params.hardGateAssessment
        );
        chartCandidate = hardGateAligned.chart;
        logChartAssessmentAlignment(
          "hardGate",
          params.navLocale,
          hardGateAligned.fields
        );
      }
      const validationOutcome = validateChartData(
        chartCandidate,
        params.evidenceEvaluationMarkdown,
        params.navLocale,
        params.hardGateAssessment
      );
      if (validationOutcome.ok) {
        logInfo("matchProfile", "chart validated; pending pitch score sync", {
          navLocale: params.navLocale,
          attempt: attemptIndex + 1,
          dimensionCount: validationOutcome.chart.capabilityDimensions.length,
          technicalFit: validationOutcome.chart.assessmentSummary.technicalFit,
          evidenceConfidence:
            validationOutcome.chart.assessmentSummary.evidenceConfidence,
          recommendation:
            validationOutcome.chart.assessmentSummary.recommendation,
        });
        return validationOutcome.chart;
      }
      logWarn("matchProfile", "chart validation failed", {
        navLocale: params.navLocale,
        attempt: attemptIndex + 1,
        reason: validationOutcome.reason,
        detail: validationOutcome.detail,
        rawTechnicalFit:
          typeof rawChart === "object" &&
          rawChart !== null &&
          "assessmentSummary" in rawChart &&
          typeof (rawChart as { assessmentSummary?: unknown })
            .assessmentSummary === "object" &&
          (
            rawChart as {
              assessmentSummary: { technicalFit?: unknown };
            }
          ).assessmentSummary?.technicalFit,
      });
    } catch (err) {
      const finishReason =
        typeof err === "object" &&
        err !== null &&
        "finishReason" in err &&
        typeof (err as { finishReason?: unknown }).finishReason === "string"
          ? (err as { finishReason: string }).finishReason
          : "";
      const isTruncated = finishReason === "length";
      logError("matchProfile", "chart generateObject failed", err, {
        navLocale: params.navLocale,
        attempt: attemptIndex + 1,
        finishReason: finishReason || undefined,
      });
      if (
        !isTruncated ||
        attemptIndex === CHART_PROJECTION_ATTEMPTS.length - 1
      ) {
        return null;
      }
      logWarn("matchProfile", "chart projection retrying compact", {
        navLocale: params.navLocale,
      });
    }
  }
  return null;
}
