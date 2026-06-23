import { formatDataStreamPart, streamText } from "ai";
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
import { streamModelStage } from "../../../reliability/withReliability.js";

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

  // Load-bearing: every downstream stage consumes this. On failure we fail
  // closed (let it throw) rather than fabricate an empty evaluation.
  const evaluatorResult = streamModelStage(
    "evidence_evaluation",
    CHAT_MODEL,
    ({ abortSignal, maxRetries, onError, onFinish }) =>
      streamText({
        model: params.openai(CHAT_MODEL),
        system: buildEvidenceEvaluatorSystemPrompt(params.navLocale),
        prompt,
        maxTokens: EVIDENCE_EVALUATOR_MAX_TOKENS,
        experimental_transform: recruiterStreamTextSmoothTransform,
        abortSignal,
        maxRetries,
        onError,
        onFinish,
      })
  );
  evaluatorResult.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });

  const evidenceEvaluationMarkdown = (await evaluatorResult.text).trim();

  params.dataStream.write(formatDataStreamPart("text", "\n\n---\n\n"));

  return {
    evidenceEvaluationMarkdown,
  };
}
