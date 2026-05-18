import { contextAgent } from "../agents/context/contextAgent.js";
import { evidenceAnalysisAgent } from "../agents/evidenceAnalysis/evidenceAnalysisAgent.js";
import { evidenceEvaluationAgent } from "../agents/evidenceEvaluation/evidenceEvaluationAgent.js";
import { hardGatesAgent } from "../agents/hardGates/hardGatesAgent.js";
import { interestsAgent } from "../agents/interests/interestsAgent.js";
import { recruiterAgent } from "../agents/recruiter/recruiterAgent.js";
import { referencesAgent } from "../agents/references/referencesAgent.js";
import { buildEvidenceBriefForPitch } from "./buildEvidenceBriefForPitch.js";
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

  const recruiterContext = await contextAgent.createContext({
    openai,
    navLocale,
    userText,
  });

  const evaluation = await evidenceEvaluationAgent.evaluateEvidence({
    openai,
    dataStream,
    navLocale,
    userText,
    sourceExcerpts: recruiterContext.sourceExcerpts,
  });

  const isOffTopic = recruiterAgent.evaluateOffTopic(
    evaluation.evidenceEvaluationMarkdown
  );

  const hardGates = await hardGatesAgent.assessHardGates({
    openai,
    navLocale,
    userText,
    evidenceEvaluationMarkdown: evaluation.evidenceEvaluationMarkdown,
    isOffTopic,
  });

  interestsAgent.scheduleEvaluation({
    openai,
    navLocale,
    userText,
    evidenceEvaluationMarkdown: evaluation.evidenceEvaluationMarkdown,
    interestsPack: recruiterContext.interestsPack,
  });

  const analysis = await evidenceAnalysisAgent.analyzeEvidence({
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

  await recruiterAgent.syncChartWithPitch({
    dataStream,
    chartData,
    pitchText: pitch.assistantText,
    navLocale,
    evidenceEvaluationMarkdown: evaluation.evidenceEvaluationMarkdown,
  });

  await referencesAgent.generateReferences({
    openai,
    dataStream,
    assistantText: pitch.assistantText,
    chunksForNavLocale: recruiterContext.chunksForNavLocale,
    navLocale,
    topChunks: recruiterContext.topChunks,
  });
}
