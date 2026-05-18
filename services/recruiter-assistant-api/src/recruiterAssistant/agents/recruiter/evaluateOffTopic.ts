import { isRecruiterOffTopicBriefMarkdown } from "../../../constants.js";

/** Whether evaluator output is the localized off-topic brief (recruiter-facing stages skip chart). */
export function evaluateOffTopic(evidenceEvaluationMarkdown: string): boolean {
  return isRecruiterOffTopicBriefMarkdown(evidenceEvaluationMarkdown);
}
