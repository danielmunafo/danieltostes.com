import { streamText } from "ai";
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
import { makeStreamTraceOnFinish } from "../../../tracing/requestTrace.js";

export async function analyzeEvidence(params: {
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

  const startedAt = Date.now();
  const evidenceAnalysisResult = streamText({
    model: params.openai(CHAT_MODEL),
    system: buildEvidenceAnalystSystemPrompt(params.navLocale),
    prompt: evidenceAnalystUserPrompt,
    maxTokens: EVIDENCE_BRIEF_MAX_TOKENS,
    experimental_transform: recruiterStreamTextSmoothTransform,
    onFinish: makeStreamTraceOnFinish(
      "evidence_analysis",
      CHAT_MODEL,
      startedAt
    ),
  });
  evidenceAnalysisResult.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });

  const evidenceAnalysisMarkdown = (await evidenceAnalysisResult.text).trim();

  return { evidenceAnalysisMarkdown };
}
