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
import { traceStreamText } from "../../../reliability/streamTextReliability.js";

export async function streamBriefingPrep(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  navLocale: RecruiterNavLocale;
  evidenceEvaluationMarkdown: string;
  evidenceAnalysisMarkdown: string;
  streamSignal?: AbortSignal;
}): Promise<void> {
  const briefingPrepStatusStream = traceStreamText({
    traceStage: "briefing_prep",
    traceModel: CHAT_MODEL,
    traceSignal: params.streamSignal,
    model: params.openai(CHAT_MODEL),
    system: buildBriefingPrepStatusSystemPrompt(params.navLocale),
    prompt: buildBriefingPrepStatusUserPrompt(
      params.evidenceEvaluationMarkdown,
      params.evidenceAnalysisMarkdown
    ),
    maxTokens: BRIEFING_PREP_STATUS_MAX_TOKENS,
    experimental_transform: recruiterStreamTextSmoothTransform,
  });
  briefingPrepStatusStream.result.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });
  await briefingPrepStatusStream.text;
}
