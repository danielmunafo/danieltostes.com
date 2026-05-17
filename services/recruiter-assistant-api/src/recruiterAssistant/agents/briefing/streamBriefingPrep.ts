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

export async function streamBriefingPrep(params: {
  openai: OpenAiProvider;
  dataStream: RecruiterDataStream;
  navLocale: RecruiterNavLocale;
  evidenceEvaluationMarkdown: string;
  evidenceAnalysisMarkdown: string;
}): Promise<void> {
  const briefingPrepStatusResult = streamText({
    model: params.openai(CHAT_MODEL),
    system: buildBriefingPrepStatusSystemPrompt(params.navLocale),
    prompt: buildBriefingPrepStatusUserPrompt(
      params.evidenceEvaluationMarkdown,
      params.evidenceAnalysisMarkdown
    ),
    maxTokens: BRIEFING_PREP_STATUS_MAX_TOKENS,
    experimental_transform: recruiterStreamTextSmoothTransform,
  });
  briefingPrepStatusResult.mergeIntoDataStream(params.dataStream, {
    experimental_sendFinish: false,
  });
  await briefingPrepStatusResult.text;
}
