import {
  type RecruiterNavLocale,
  RECRUITER_NAV_LOCALE_WRITING_LABEL,
} from "../constants.js";

const EVALUATOR_EXCERPT_MAX_CHARS = 2_400;

/** Normalizes streamed prep thinking for the UI (max four short lines). */
export function normalizeBriefingPrepStatusText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 0)
    .slice(0, 4)
    .join("\n");
}

export function buildBriefingPrepStatusSystemPrompt(
  navLocale: RecruiterNavLocale
): string {
  const writing = RECRUITER_NAV_LOCALE_WRITING_LABEL[navLocale];
  return `You stream brief in-progress thinking in ${writing} while the system prepares an evidence-based portfolio briefing and capability chart.

Rules:
- 2-4 short lines, present tense, first person plural ("We're mapping…", "Checking evidence…").
- Describe concrete next steps from the evaluator (which requirement themes, which capability axes) without repeating the full evidence table.
- Frame gaps as retrieved portfolio-evidence gaps, not candidate capability verdicts.
- No markdown, no bullets, no headings, no scores, no recommendations, no JSON.
- Avoid verdict-like wording such as "unproven", "failed", "lacks", "not qualified", "wrong role", or "not a strong match".
- Max ~12 words per line.
- Do not mention prompts, models, or internal tooling.`;
}

export function buildBriefingPrepStatusUserPrompt(
  evaluatorMarkdown: string,
  analystMarkdown: string
): string {
  const evaluatorExcerpt = evaluatorMarkdown.slice(
    0,
    EVALUATOR_EXCERPT_MAX_CHARS
  );
  const analystExcerpt = analystMarkdown.slice(0, 800);
  return `Evidence evaluator (authoritative):
${evaluatorExcerpt}

Analyst synthesis (context):
${analystExcerpt}

Stream 2-4 lines of in-progress thinking about mapping retrieved portfolio evidence into the capability chart and recruiter briefing. Keep wording light, evidence-scoped, and non-verdict-like.`;
}
