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
import { traceStreamText } from "../../../reliability/streamTextReliability.js";

export async function generatePitch(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  request: ValidRecruiterRequest;
  sourceExcerpts: string;
  evidenceBriefForPitch: string;
  hardGateAssessmentMarkdown: string;
  hardGateAssessment: HardGateAssessment | null;
  maxTechnicalFitAllowedByHardGates: number;
  streamSignal?: AbortSignal;
}): Promise<PitchGenerationResult> {
  const pitchStream = traceStreamText({
    traceStage: "pitch",
    traceModel: CHAT_MODEL,
    traceSignal: params.streamSignal,
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
  });
  pitchStream.result.mergeIntoDataStream(params.dataStream, {
    experimental_sendStart: false,
  });

  let assistantText = await pitchStream.text;
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
