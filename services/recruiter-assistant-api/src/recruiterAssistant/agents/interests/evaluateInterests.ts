import { generateText } from "ai";
import {
  CHAT_MODEL,
  INTERESTS_ALIGNMENT_MAX_TOKENS,
  isRecruiterOffTopicBriefMarkdown,
  type RecruiterNavLocale,
} from "../../../constants.js";
import type { InterestsPack } from "../../../interests/loadInterestsPack.js";
import { shouldOmitInterestsOutputMarkdown } from "../../../interests/loadInterestsPack.js";
import { logInfo } from "../../../logging/logger.js";
import type { OpenAiProvider } from "../../types.js";
import {
  buildInterestsEvaluatorSystemPrompt,
  buildInterestsEvaluatorUserPrompt,
} from "./assemblePrompt.js";

export async function evaluateInterests(params: {
  openai: OpenAiProvider;
  navLocale: RecruiterNavLocale;
  userText: string;
  evidenceEvaluationMarkdown: string;
  interestsPack: InterestsPack | null;
}): Promise<void> {
  const canRun =
    Boolean(params.interestsPack?.criteriaMarkdown.trim()) &&
    !isRecruiterOffTopicBriefMarkdown(params.evidenceEvaluationMarkdown);

  if (!canRun || !params.interestsPack) {
    return;
  }

  const { text: rawInterests } = await generateText({
    model: params.openai(CHAT_MODEL),
    system: buildInterestsEvaluatorSystemPrompt(params.navLocale),
    prompt: buildInterestsEvaluatorUserPrompt(
      params.navLocale,
      params.userText,
      params.interestsPack.criteriaMarkdown
    ),
    maxTokens: INTERESTS_ALIGNMENT_MAX_TOKENS,
  });

  const trimmed = rawInterests.trim();
  logInfo(
    "interestsEvaluator",
    "interests evaluation completed but not streamed",
    {
      navLocale: params.navLocale,
      chars: trimmed.length,
      omitted: shouldOmitInterestsOutputMarkdown(trimmed),
    }
  );
}
