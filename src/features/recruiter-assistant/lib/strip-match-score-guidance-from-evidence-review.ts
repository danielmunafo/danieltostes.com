/**
 * Localized `# Match Score Guidance` headings from the evidence evaluator
 * (`RECRUITER_EVIDENCE_EVALUATOR_LABELS` in the API package). Kept in sync manually.
 */
export const EVIDENCE_REVIEW_MATCH_SCORE_GUIDANCE_HEADINGS = [
  "Match Score Guidance",
  "Orientação de pontuação de aderência",
  "Guía de puntuación de encaje",
  "Guida al punteggio di aderenza",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Removes the evaluator match-score guidance block (including recommended match
 * strength) from markdown shown in the collapsible evidence review panel.
 * The full stream is unchanged; scores still appear in the briefing and chart.
 */
export function stripMatchScoreGuidanceFromEvidenceReview(
  markdown: string
): string {
  let result = markdown;
  for (const heading of EVIDENCE_REVIEW_MATCH_SCORE_GUIDANCE_HEADINGS) {
    const pattern = new RegExp(
      `(^|\\n)#\\s*${escapeRegExp(heading)}\\s*\\n[\\s\\S]*?(?=\\n#\\s|\\n---\\n|$)`,
      "i"
    );
    result = result.replace(pattern, "$1");
  }
  return result.replace(/\n{3,}/g, "\n\n").trim();
}
