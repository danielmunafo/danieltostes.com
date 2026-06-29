import { formatDataStreamPart } from "ai";
import {
  CHAT_MODEL,
  EVIDENCE_EVALUATOR_MAX_TOKENS,
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
import { traceStreamText } from "../../../reliability/streamTextReliability.js";

export async function evaluateEvidence(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  navLocale: RecruiterNavLocale;
  userText: string;
  sourceExcerpts: string;
  streamSignal?: AbortSignal;
}): Promise<EvidenceEvaluationResult> {
  const prompt = buildEvidenceEvaluatorUserPrompt(
    params.navLocale,
    params.userText,
    params.sourceExcerpts
  );

  const evaluatorStream = traceStreamText({
    traceStage: "evidence_evaluation",
    traceModel: CHAT_MODEL,
    traceSignal: params.streamSignal,
    model: params.openai(CHAT_MODEL),
    system: buildEvidenceEvaluatorSystemPrompt(params.navLocale),
    prompt,
    maxTokens: EVIDENCE_EVALUATOR_MAX_TOKENS,
    experimental_transform: recruiterStreamTextSmoothTransform,
  });
  evaluatorStream.result.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });

  const evidenceEvaluationMarkdown = (await evaluatorStream.text).trim();

  params.dataStream.write(formatDataStreamPart("text", "\n\n---\n\n"));

  return {
    evidenceEvaluationMarkdown,
  };
}
