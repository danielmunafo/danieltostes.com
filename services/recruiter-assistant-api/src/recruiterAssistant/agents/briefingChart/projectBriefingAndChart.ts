import { streamText } from "ai";
import {
  BRIEFING_PREP_STATUS_MAX_TOKENS,
  CHAT_MODEL,
  recruiterStreamTextSmoothTransform,
  type RecruiterNavLocale,
} from "../../../constants.js";
import { logInfo } from "../../../logging/logger.js";
import {
  alignChartAssessmentWithHardGates,
  logChartAssessmentAlignment,
} from "../../../rag/alignChartAssessment.js";
import type { HardGateAssessment } from "../../../rag/hardGates/index.js";
import { projectChartData } from "../../chart/projectChartData.js";
import { emitPrePitchChartData } from "../../chart/emitChartMarkers.js";
import {
  writeBriefingPrepClose,
  writeBriefingPrepOpen,
  writeChartOpen,
} from "../../stream/streamMarkers.js";
import type {
  BriefingAndChartResult,
  OpenAiProvider,
  RecruiterDataStream,
} from "../../types.js";
import {
  buildBriefingPrepStatusSystemPrompt,
  buildBriefingPrepStatusUserPrompt,
} from "./assembleBriefingPrompt.js";

export async function projectBriefingAndChart(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  navLocale: RecruiterNavLocale;
  userText: string;
  evidenceEvaluationMarkdown: string;
  evidenceAnalysisMarkdown: string;
  hardGateAssessmentMarkdown: string;
  hardGateAssessment: HardGateAssessment | null;
  isOffTopic: boolean;
}): Promise<BriefingAndChartResult> {
  if (params.isOffTopic) {
    logInfo("matchProfile", "chart skipped: evaluator off-topic", {
      navLocale: params.navLocale,
    });
    return { chartData: null };
  }

  writeChartOpen(params.dataStream);
  writeBriefingPrepOpen(params.dataStream);

  const briefingPrepStatusResult = streamText({
    model: params.openai(CHAT_MODEL),
    system: buildBriefingPrepStatusSystemPrompt(params.navLocale),
    prompt: buildBriefingPrepStatusUserPrompt(
      params.evidenceEvaluationMarkdown,
      params.evidenceAnalysisMarkdown
    ),
    maxTokens: BRIEFING_PREP_STATUS_MAX_TOKENS,
    experimental_transform: recruiterStreamTextSmoothTransform,
  });
  briefingPrepStatusResult.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });

  const chartPromise = projectChartData({
    openai: params.openai,
    navLocale: params.navLocale,
    userText: params.userText,
    evidenceEvaluationMarkdown: params.evidenceEvaluationMarkdown,
    evidenceAnalysisMarkdown: params.evidenceAnalysisMarkdown,
    hardGateAssessmentMarkdown: params.hardGateAssessmentMarkdown,
    hardGateAssessment: params.hardGateAssessment,
  });

  const [, chartFromProjection] = await Promise.all([
    briefingPrepStatusResult.text,
    chartPromise,
  ]);

  writeBriefingPrepClose(params.dataStream);

  let chartData = chartFromProjection;
  if (chartData && params.hardGateAssessment) {
    const hardGateAligned = alignChartAssessmentWithHardGates(
      chartData,
      params.hardGateAssessment
    );
    chartData = hardGateAligned.chart;
    logChartAssessmentAlignment(
      "hardGate",
      params.navLocale,
      hardGateAligned.fields
    );
  }

  emitPrePitchChartData({
    dataStream: params.dataStream,
    chartData,
    navLocale: params.navLocale,
  });

  return { chartData };
}
