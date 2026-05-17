import { buildEvidenceBriefForPitch } from "./buildEvidenceBriefForPitch.js";
import { recruiterAgent } from "../agents/recruiterAgent.js";
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

  const recruiterContext = await recruiterAgent.createContext({
    openai,
    navLocale,
    userText,
  });

  const evaluation = await recruiterAgent.evaluateEvidence({
    openai,
    dataStream,
    navLocale,
    userText,
    sourceExcerpts: recruiterContext.sourceExcerpts,
  });

  const hardGates = await recruiterAgent.assessHardGates({
    openai,
    navLocale,
    userText,
    evidenceEvaluationMarkdown: evaluation.evidenceEvaluationMarkdown,
    isOffTopic: evaluation.isOffTopic,
  });

  recruiterAgent.evaluateInterests({
    openai,
    navLocale,
    userText,
    evidenceEvaluationMarkdown: evaluation.evidenceEvaluationMarkdown,
    interestsPack: recruiterContext.interestsPack,
  });

  const analysis = await recruiterAgent.analyzeEvidence({
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

  const { chartData } = await recruiterAgent.projectBriefingAndChart({
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

  const pitch = await recruiterAgent.generatePitch({
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

  await recruiterAgent.generateReferences({
    openai,
    dataStream,
    assistantText: pitch.assistantText,
    chunksForNavLocale: recruiterContext.chunksForNavLocale,
    navLocale,
    topChunks: recruiterContext.topChunks,
  });
}
