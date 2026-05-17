import { logInfo } from "../../../logging/logger.js";
import type { HardGateAssessment } from "../../../rag/hardGates/index.js";
import type { ChartData } from "../../../rag/chartDataSchema.js";
import type { RecruiterNavLocale } from "../../../constants.js";
import { briefingAgent } from "../briefing/briefingAgent.js";
import { chartAgent } from "../chart/chartAgent.js";
import {
  writeBriefingPrepClose,
  writeBriefingPrepOpen,
  writeChartOpen,
} from "../../stream/streamMarkers.js";
import type { OpenAiProvider, RecruiterDataStream } from "../../types.js";
import { evaluateOffTopic } from "./evaluateOffTopic.js";

export type ProjectBriefingAndChartResult = {
  chartData: ChartData | null;
  isOffTopic: boolean;
};

export async function projectBriefingAndChart(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  navLocale: RecruiterNavLocale;
  userText: string;
  evidenceEvaluationMarkdown: string;
  evidenceAnalysisMarkdown: string;
  hardGateAssessmentMarkdown: string;
  hardGateAssessment: HardGateAssessment | null;
}): Promise<ProjectBriefingAndChartResult> {
  const isOffTopic = evaluateOffTopic(params.evidenceEvaluationMarkdown);

  if (isOffTopic) {
    logInfo("matchProfile", "chart skipped: evaluator off-topic", {
      navLocale: params.navLocale,
    });
    return { chartData: null, isOffTopic };
  }

  writeChartOpen(params.dataStream);
  writeBriefingPrepOpen(params.dataStream);

  const [, projectedChart] = await Promise.all([
    briefingAgent.streamBriefingPrep({
      openai: params.openai,
      dataStream: params.dataStream,
      navLocale: params.navLocale,
      evidenceEvaluationMarkdown: params.evidenceEvaluationMarkdown,
      evidenceAnalysisMarkdown: params.evidenceAnalysisMarkdown,
    }),
    chartAgent.projectChart({
      openai: params.openai,
      navLocale: params.navLocale,
      userText: params.userText,
      evidenceEvaluationMarkdown: params.evidenceEvaluationMarkdown,
      evidenceAnalysisMarkdown: params.evidenceAnalysisMarkdown,
      hardGateAssessmentMarkdown: params.hardGateAssessmentMarkdown,
      hardGateAssessment: params.hardGateAssessment,
    }),
  ]);

  writeBriefingPrepClose(params.dataStream);
  chartAgent.emitPrePitchChart({
    dataStream: params.dataStream,
    chartData: projectedChart,
    navLocale: params.navLocale,
  });

  return { chartData: projectedChart, isOffTopic };
}
