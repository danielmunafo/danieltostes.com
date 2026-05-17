import { formatDataStreamPart, streamText } from "ai";
import {
  CHAT_MODEL,
  EVIDENCE_EVALUATOR_MAX_TOKENS,
  isRecruiterOffTopicBriefMarkdown,
  recruiterStreamTextSmoothTransform,
  type RecruiterNavLocale,
} from "../../../constants.js";
import type {
  EvidenceEvaluationResult,
  OpenAiProvider,
  RecruiterDataStream,
} from "../../types.js";
import {
  buildEvidenceEvaluatorSystemPrompt,
  buildEvidenceEvaluatorUserPrompt,
} from "./assemblePrompt.js";

export async function evaluateEvidence(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  navLocale: RecruiterNavLocale;
  userText: string;
  sourceExcerpts: string;
}): Promise<EvidenceEvaluationResult> {
  const prompt = buildEvidenceEvaluatorUserPrompt(
    params.navLocale,
    params.userText,
    params.sourceExcerpts
  );

  const evaluatorResult = streamText({
    model: params.openai(CHAT_MODEL),
    system: buildEvidenceEvaluatorSystemPrompt(params.navLocale),
    prompt,
    maxTokens: EVIDENCE_EVALUATOR_MAX_TOKENS,
    experimental_transform: recruiterStreamTextSmoothTransform,
  });
  evaluatorResult.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });

  const evidenceEvaluationMarkdown = (await evaluatorResult.text).trim();

  params.dataStream.write(formatDataStreamPart("text", "\n\n---\n\n"));

  return {
    evidenceEvaluationMarkdown,
    isOffTopic: isRecruiterOffTopicBriefMarkdown(evidenceEvaluationMarkdown),
  };
}
