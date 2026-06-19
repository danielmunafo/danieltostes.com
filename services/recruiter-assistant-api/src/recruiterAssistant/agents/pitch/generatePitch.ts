import { streamText } from "ai";
import {
  CHAT_MODEL,
  RECRUITER_PITCH_MAX_TOKENS,
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
import { makeStreamTraceOnFinish } from "../../../tracing/requestTrace.js";

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
  const startedAt = Date.now();
  const pitchResult = streamText({
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
    onFinish: makeStreamTraceOnFinish("pitch", CHAT_MODEL, startedAt),
  });
  pitchResult.mergeIntoDataStream(params.dataStream, {
    experimental_sendStart: false,
  });

  let assistantText = await pitchResult.text;
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
