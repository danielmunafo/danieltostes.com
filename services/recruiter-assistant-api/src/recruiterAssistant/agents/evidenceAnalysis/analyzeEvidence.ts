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
import { logWarn } from "../../../logging/logger.js";
import { getActiveTrace } from "../../../tracing/requestTrace.js";
import { streamModelStage } from "../../../reliability/withReliability.js";
import { getCancellationSignal } from "../../../reliability/requestCancellation.js";

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

  const evidenceAnalysisResult = streamModelStage(
    "evidence_analysis",
    CHAT_MODEL,
    ({ abortSignal, maxRetries, onError, onFinish }) =>
      streamText({
        model: params.openai(CHAT_MODEL),
        system: buildEvidenceAnalystSystemPrompt(params.navLocale),
        prompt: evidenceAnalystUserPrompt,
        maxTokens: EVIDENCE_BRIEF_MAX_TOKENS,
        experimental_transform: recruiterStreamTextSmoothTransform,
        abortSignal,
        maxRetries,
        onError,
        onFinish,
      })
  );
  evidenceAnalysisResult.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });

  try {
    const evidenceAnalysisMarkdown = (await evidenceAnalysisResult.text).trim();
    return { evidenceAnalysisMarkdown };
  } catch (err) {
    // Cancellation propagates; a genuine failure degrades to "no analyst brief"
    // and the pipeline continues on the evaluation alone.
    if (getCancellationSignal()?.aborted) throw err;
    getActiveTrace()?.recordDegradation("evidence_analysis");
    logWarn(
      "evidenceAnalysis",
      "analysis failed; continuing without analyst brief",
      { err, navLocale: params.navLocale }
    );
    return { evidenceAnalysisMarkdown: "" };
  }
}
