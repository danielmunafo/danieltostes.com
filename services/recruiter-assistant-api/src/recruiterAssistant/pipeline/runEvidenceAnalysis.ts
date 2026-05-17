import { streamText } from "ai";
import {
  CHAT_MODEL,
  EVIDENCE_BRIEF_MAX_TOKENS,
  recruiterStreamTextSmoothTransform,
} from "../../constants.js";
import {
  buildEvidenceAnalystSystemPrompt,
  buildEvidenceAnalystUserPrompt,
} from "../../rag/prompt.js";
import type { RecruiterNavLocale } from "../../constants.js";
import type {
  EvidenceAnalysisResult,
  OpenAiProvider,
  RecruiterDataStream,
} from "../types.js";

export async function runEvidenceAnalysis(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  navLocale: RecruiterNavLocale;
  userText: string;
  sourceExcerpts: string;
  evidenceEvaluationMarkdown: string;
  hardGateAssessmentMarkdown: string;
}): Promise<EvidenceAnalysisResult> {
  const evidenceAnalystUserPrompt = buildEvidenceAnalystUserPrompt(
    params.navLocale,
    params.userText,
    params.sourceExcerpts,
    params.evidenceEvaluationMarkdown,
    params.hardGateAssessmentMarkdown
  );

  const evidenceAnalysisResult = streamText({
    model: params.openai(CHAT_MODEL),
    system: buildEvidenceAnalystSystemPrompt(params.navLocale),
    prompt: evidenceAnalystUserPrompt,
    maxTokens: EVIDENCE_BRIEF_MAX_TOKENS,
    experimental_transform: recruiterStreamTextSmoothTransform,
  });
  evidenceAnalysisResult.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });

  return {
    evidenceAnalysisMarkdown: (await evidenceAnalysisResult.text).trim(),
  };
}
