import { RECRUITER_SCORES_SECTION_HEADING } from "./recruiterScoresSectionHeadings";

function stripInlineBoldMarkers(s: string): string {
  return s.replace(/\*\*/g, "").trim();
}

/**
 * Main `# Scores` **Reason** line (not evaluator "evidence confidence reason" copy).
 * Requires the label colon immediately after Reason / Razón / Motivo so longer labels
 * like "Motivo da confiança …:" do not match.
 */
function tryParseMainReasonLine(trimmedLine: string): string | null {
  const deTagged = stripInlineBoldMarkers(trimmedLine)
    .replace(/^[-*]\s+/, "")
    .trim();

  const mReason = /^(Reason|Razón|Motivo)\s*:\s*(.+)$/isu.exec(deTagged);
  if (!mReason) return null;
  return mReason[2]?.trim() || null;
}

/** Index range of a pitch `# Scores` block (heading line included). */
export function extractScoresSectionRange(
  markdown: string,
  scoresTitle: string
): { start: number; end: number } | null {
  const needle = `# ${scoresTitle}`;
  const atStart = markdown.startsWith(needle)
    ? 0
    : markdown.indexOf(`\n${needle}`);
  if (atStart < 0) return null;
  const idx = atStart > 0 ? atStart + 1 : 0;
  const afterHeading = markdown.slice(idx + needle.length);
  const nextH1 = afterHeading.search(/\n# /);
  const end = nextH1 >= 0 ? idx + needle.length + nextH1 : markdown.length;
  return { start: idx, end };
}

/** Pitch body inside `# Scores` (no heading line). */
export function extractMainReasonFromScoresBody(
  scoresBody: string
): string | null {
  for (const line of scoresBody.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const reason = tryParseMainReasonLine(trimmed);
    if (reason) return reason;
  }
  return null;
}

/**
 * When the match profile chart is on screen, `# Scores` duplicates numeric summary rows.
 * Pull the narrative **Reason** out for the profile chrome, and drop `# Scores` from markdown.
 */
export function extractScoresReasonAndStripScoresSection(
  pitchMarkdown: string,
  locale: string
): { pitchMarkdown: string; scoresReason: string | null } {
  const scoresTitle =
    RECRUITER_SCORES_SECTION_HEADING[locale] ??
    RECRUITER_SCORES_SECTION_HEADING.en;
  const range = extractScoresSectionRange(pitchMarkdown, scoresTitle);
  if (!range) {
    return { pitchMarkdown, scoresReason: null };
  }

  const needle = `# ${scoresTitle}`;
  const sectionBody = pitchMarkdown.slice(
    range.start + needle.length,
    range.end
  );
  const scoresReason = extractMainReasonFromScoresBody(sectionBody);

  const before = pitchMarkdown.slice(0, range.start).trimEnd();
  const after = pitchMarkdown.slice(range.end).trimStart();
  const glue = before && after ? `${before}\n\n${after}` : `${before}${after}`;
  const pitchOut = glue.replace(/\n{3,}/g, "\n\n").trim();

  return { pitchMarkdown: pitchOut, scoresReason };
}
