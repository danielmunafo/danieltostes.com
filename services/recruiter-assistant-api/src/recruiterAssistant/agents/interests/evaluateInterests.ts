import { generateText } from "ai";
import {
  CHAT_MODEL,
  INTERESTS_ALIGNMENT_MAX_TOKENS,
  type RecruiterNavLocale,
} from "../../../constants.js";
import { evaluateOffTopic } from "../recruiter/evaluateOffTopic.js";
import type { InterestsPack } from "../../../interests/loadInterestsPack.js";
import { shouldOmitInterestsOutputMarkdown } from "../../../interests/loadInterestsPack.js";
import { logInfo, logWarn } from "../../../logging/logger.js";
import { traceGenerate } from "../../../tracing/requestTrace.js";
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
    !evaluateOffTopic(params.evidenceEvaluationMarkdown);

  if (!canRun || !params.interestsPack) {
    return;
  }

  try {
    const { text: rawInterests } = await traceGenerate(
      "interests",
      CHAT_MODEL,
      "chat",
      () =>
        generateText({
          model: params.openai(CHAT_MODEL),
          system: buildInterestsEvaluatorSystemPrompt(params.navLocale),
          prompt: buildInterestsEvaluatorUserPrompt(
            params.navLocale,
            params.userText,
            params.interestsPack!.criteriaMarkdown
          ),
          maxTokens: INTERESTS_ALIGNMENT_MAX_TOKENS,
        })
    );

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
  } catch (err) {
    logWarn("interestsEvaluator", "interests evaluation failed", {
      err,
      navLocale: params.navLocale,
    });
  }
}

/** Server-only interests pass; does not block the user-visible stream. */
export function scheduleInterestsEvaluation(
  params: Parameters<typeof evaluateInterests>[0]
): void {
  void evaluateInterests(params);
}
