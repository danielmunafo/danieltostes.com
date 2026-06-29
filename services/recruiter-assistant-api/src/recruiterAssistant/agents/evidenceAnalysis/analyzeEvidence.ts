import {
  CHAT_MODEL,
  EVIDENCE_BRIEF_MAX_TOKENS,
  recruiterStreamTextSmoothTransform,
  type RecruiterNavLocale,
} from "../../../constants.js";
import type {
  EvidenceAnalysisResult,
  OpenAiProvider,
  RecruiterDataStream,
} from "../../types.js";
import {
  buildEvidenceAnalystSystemPrompt,
  buildEvidenceAnalystUserPrompt,
} from "./assemblePrompt.js";
import { traceStreamText } from "../../../reliability/streamTextReliability.js";

export async function analyzeEvidence(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  navLocale: RecruiterNavLocale;
  userText: string;
  sourceExcerpts: string;
  evidenceEvaluationMarkdown: string;
  hardGateAssessmentMarkdown: string;
  streamSignal?: AbortSignal;
}): Promise<EvidenceAnalysisResult> {
  const evidenceAnalystUserPrompt = buildEvidenceAnalystUserPrompt(
    params.navLocale,
    params.userText,
    params.sourceExcerpts,
    params.evidenceEvaluationMarkdown,
    params.hardGateAssessmentMarkdown
  );

  const evidenceAnalysisStream = traceStreamText({
    traceStage: "evidence_analysis",
    traceModel: CHAT_MODEL,
    traceSignal: params.streamSignal,
    model: params.openai(CHAT_MODEL),
    system: buildEvidenceAnalystSystemPrompt(params.navLocale),
    prompt: evidenceAnalystUserPrompt,
    maxTokens: EVIDENCE_BRIEF_MAX_TOKENS,
    experimental_transform: recruiterStreamTextSmoothTransform,
  });
  evidenceAnalysisStream.result.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });

  const evidenceAnalysisMarkdown = (await evidenceAnalysisStream.text).trim();

  return { evidenceAnalysisMarkdown };
}
