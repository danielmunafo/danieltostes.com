import { formatDataStreamPart, streamText } from "ai";
import {
  CHAT_MODEL,
  RECRUITER_PITCH_MAX_TOKENS,
  RECRUITER_STREAM_INTERRUPTED_NOTICE,
  recruiterStreamTextSmoothTransform,
} from "../../../constants.js";
import { validateAndClampPitchHardGates } from "../../../rag/hardGates/index.js";
import type { HardGateAssessment } from "../../../rag/hardGates/index.js";
import type {
  OpenAiProvider,
  PitchGenerationResult,
  RecruiterDataStream,
  ValidRecruiterRequest,
} from "../../types.js";
import { buildRecruiterPitchSystemPrompt } from "./assemblePrompt.js";
import { logWarn } from "../../../logging/logger.js";
import { getActiveTrace } from "../../../tracing/requestTrace.js";
import { streamModelStage } from "../../../reliability/withReliability.js";
import { getCancellationSignal } from "../../../reliability/requestCancellation.js";

export async function generatePitch(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  request: ValidRecruiterRequest;
  sourceExcerpts: string;
  evidenceBriefForPitch: string;
  hardGateAssessmentMarkdown: string;
  hardGateAssessment: HardGateAssessment | null;
  maxTechnicalFitAllowedByHardGates: number;
}): Promise<PitchGenerationResult> {
  const pitchResult = streamModelStage(
    "pitch",
    CHAT_MODEL,
    ({ abortSignal, maxRetries, onError, onFinish }) =>
      streamText({
        model: params.openai(CHAT_MODEL),
        system: buildRecruiterPitchSystemPrompt(
          params.evidenceBriefForPitch,
          params.sourceExcerpts,
          params.request.portfolioLanguage,
          params.request.navLocale,
          params.hardGateAssessmentMarkdown,
          params.maxTechnicalFitAllowedByHardGates
        ),
        messages: params.request.coreMessages,
        maxTokens: RECRUITER_PITCH_MAX_TOKENS,
        experimental_transform: recruiterStreamTextSmoothTransform,
        abortSignal,
        maxRetries,
        onError,
        onFinish,
      })
  );
  pitchResult.mergeIntoDataStream(params.dataStream, {
    experimental_sendStart: false,
  });

  let assistantText: string;
  try {
    assistantText = await pitchResult.text;
  } catch (err) {
    // Cancellation propagates. A genuine mid-stream failure cannot be replayed
    // (bytes are already on the wire), so append a visible, localized notice
    // instead of leaving a silently truncated pitch that looks finished.
    if (getCancellationSignal()?.aborted) throw err;
    getActiveTrace()?.recordDegradation("pitch");
    params.dataStream.write(
      formatDataStreamPart(
        "text",
        RECRUITER_STREAM_INTERRUPTED_NOTICE[params.request.navLocale]
      )
    );
    logWarn("pitch", "pitch failed mid-stream; emitted interruption notice", {
      err,
      navLocale: params.request.navLocale,
    });
    return { assistantText: "" };
  }

  if (params.hardGateAssessment) {
    const clamped = validateAndClampPitchHardGates(
      assistantText,
      params.hardGateAssessment,
      params.request.navLocale
    );
    assistantText = clamped.text;
  }

  return { assistantText };
}
