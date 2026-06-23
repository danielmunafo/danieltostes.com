import { streamText } from "ai";
import {
  BRIEFING_PREP_STATUS_MAX_TOKENS,
  CHAT_MODEL,
  recruiterStreamTextSmoothTransform,
  type RecruiterNavLocale,
} from "../../../constants.js";
import type { OpenAiProvider, RecruiterDataStream } from "../../types.js";
import {
  buildBriefingPrepStatusSystemPrompt,
  buildBriefingPrepStatusUserPrompt,
} from "./assembleBriefingPrompt.js";
import { logWarn } from "../../../logging/logger.js";
import { getActiveTrace } from "../../../tracing/requestTrace.js";
import { streamModelStage } from "../../../reliability/withReliability.js";
import { getCancellationSignal } from "../../../reliability/requestCancellation.js";

export async function streamBriefingPrep(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  navLocale: RecruiterNavLocale;
  evidenceEvaluationMarkdown: string;
  evidenceAnalysisMarkdown: string;
}): Promise<void> {
  const briefingPrepStatusResult = streamModelStage(
    "briefing_prep",
    CHAT_MODEL,
    ({ abortSignal, maxRetries, onError, onFinish }) =>
      streamText({
        model: params.openai(CHAT_MODEL),
        system: buildBriefingPrepStatusSystemPrompt(params.navLocale),
        prompt: buildBriefingPrepStatusUserPrompt(
          params.evidenceEvaluationMarkdown,
          params.evidenceAnalysisMarkdown
        ),
        maxTokens: BRIEFING_PREP_STATUS_MAX_TOKENS,
        experimental_transform: recruiterStreamTextSmoothTransform,
        abortSignal,
        maxRetries,
        onError,
        onFinish,
      })
  );
  briefingPrepStatusResult.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });
  try {
    await briefingPrepStatusResult.text;
  } catch (err) {
    // This status line is cosmetic. Swallow its failure so it can never reject
    // the Promise.all that also drives chart projection (cancellation still
    // propagates and aborts both intentionally).
    if (getCancellationSignal()?.aborted) throw err;
    getActiveTrace()?.recordDegradation("briefing_prep");
    logWarn(
      "briefingPrep",
      "briefing prep status failed; skipping (cosmetic)",
      {
        err,
        navLocale: params.navLocale,
      }
    );
  }
}
