import { buildEvidenceBriefForPitch } from "./buildEvidenceBriefForPitch.js";
import { prepareRecruiterContext } from "./prepareRecruiterContext.js";
import { runBriefingAndChartProjection } from "./runBriefingAndChartProjection.js";
import { runEvidenceAnalysis } from "./runEvidenceAnalysis.js";
import { runEvidenceEvaluation } from "./runEvidenceEvaluation.js";
import { runHardGateAssessment } from "./runHardGateAssessment.js";
import { runInterestsEvaluation } from "./runInterestsEvaluation.js";
import { runPitchGeneration } from "./runPitchGeneration.js";
import { runReferencesGeneration } from "./runReferencesGeneration.js";
import { syncChartWithPitch } from "../chart/syncChartWithPitch.js";
import {
  writeThinkingClose,
  writeThinkingOpen,
} from "../stream/streamMarkers.js";
import type { RecruiterPipelineParams } from "../types.js";

export async function runRecruiterAssistantPipeline(
  params: RecruiterPipelineParams
): Promise<void> {
  const { request, openai, dataStream } = params;
  const { navLocale, guardedText: userText } = request;

  writeThinkingOpen(dataStream);

  const recruiterContext = await prepareRecruiterContext({
    openai,
    navLocale,
    userText,
  });

  const evaluation = await runEvidenceEvaluation({
    openai,
    dataStream,
    navLocale,
    userText,
    sourceExcerpts: recruiterContext.sourceExcerpts,
  });

  const hardGates = await runHardGateAssessment({
    openai,
    navLocale,
    userText,
    evidenceEvaluationMarkdown: evaluation.evidenceEvaluationMarkdown,
    isOffTopic: evaluation.isOffTopic,
  });

  runInterestsEvaluation({
    openai,
    navLocale,
    userText,
    evidenceEvaluationMarkdown: evaluation.evidenceEvaluationMarkdown,
    interestsPack: recruiterContext.interestsPack,
  });

  const analysis = await runEvidenceAnalysis({
    openai,
    dataStream,
    navLocale,
    userText,
    sourceExcerpts: recruiterContext.sourceExcerpts,
    evidenceEvaluationMarkdown: evaluation.evidenceEvaluationMarkdown,
    hardGateAssessmentMarkdown: hardGates.hardGateAssessmentMarkdown,
  });

  writeThinkingClose(dataStream);

  const evidenceBriefForPitch = buildEvidenceBriefForPitch(
    evaluation.evidenceEvaluationMarkdown,
    analysis.evidenceAnalysisMarkdown
  );

  const { chartData } = await runBriefingAndChartProjection({
    openai,
    dataStream,
    navLocale,
    userText,
    evidenceEvaluationMarkdown: evaluation.evidenceEvaluationMarkdown,
    evidenceAnalysisMarkdown: analysis.evidenceAnalysisMarkdown,
    hardGateAssessmentMarkdown: hardGates.hardGateAssessmentMarkdown,
    hardGateAssessment: hardGates.assessment,
    isOffTopic: evaluation.isOffTopic,
  });

  const pitch = await runPitchGeneration({
    openai,
    dataStream,
    request,
    sourceExcerpts: recruiterContext.sourceExcerpts,
    evidenceBriefForPitch,
    hardGateAssessmentMarkdown: hardGates.hardGateAssessmentMarkdown,
    hardGateAssessment: hardGates.assessment,
    maxTechnicalFitAllowedByHardGates:
      hardGates.maxTechnicalFitAllowedByHardGates,
  });

  await syncChartWithPitch({
    dataStream,
    chartData,
    pitchText: pitch.assistantText,
    navLocale,
    isOffTopic: evaluation.isOffTopic,
  });

  await runReferencesGeneration({
    openai,
    dataStream,
    assistantText: pitch.assistantText,
    chunksForNavLocale: recruiterContext.chunksForNavLocale,
    navLocale,
    topChunks: recruiterContext.topChunks,
  });
}
