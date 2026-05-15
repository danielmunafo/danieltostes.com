import {
  type RecruiterNavLocale,
  RECRUITER_EVIDENCE_CONFIDENCE_TOKENS,
  RECRUITER_EVIDENCE_EVALUATOR_LABELS,
} from "../constants.js";
import type { ChartEvidenceConfidence } from "./chartDataSchema.js";

export type EvaluatorMatchMetadata = {
  readonly technicalFitCeiling: number;
  readonly evidenceConfidence: ChartEvidenceConfidence;
};

const ENGLISH_SCORE_LABEL_ALIASES = [
  "Recommended match strength",
  "Technical fit",
  "Match strength",
] as const;

const MATCH_SCORE_REGION_MAX_CHARS = 3_500;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMarkdownEmphasis(value: string): string {
  return value.replace(/\*/g, "").trim();
}

function mapLocaleConfidenceToCanonical(
  token: string,
  navLocale: RecruiterNavLocale
): ChartEvidenceConfidence | null {
  const normalized = stripMarkdownEmphasis(token);
  const conf = RECRUITER_EVIDENCE_CONFIDENCE_TOKENS[navLocale];
  if (normalized === conf.high) return "High";
  if (normalized === conf.medium) return "Medium";
  if (normalized === conf.low) return "Low";
  if (/^high$/i.test(normalized)) return "High";
  if (/^medium$/i.test(normalized)) return "Medium";
  if (/^low$/i.test(normalized)) return "Low";
  return null;
}

function extractSectionAfterHeadingMatch(
  evaluatorMarkdown: string,
  headingMatch: RegExpExecArray
): string {
  const sectionStart = headingMatch.index + headingMatch[0].length;
  const rest = evaluatorMarkdown.slice(sectionStart);
  const nextHeading = rest.search(/^#{1,3}\s+/m);
  const section = nextHeading === -1 ? rest : rest.slice(0, nextHeading);
  return section.slice(0, MATCH_SCORE_REGION_MAX_CHARS);
}

function extractMatchScoreGuidanceSection(
  evaluatorMarkdown: string,
  headingTitle: string
): string | null {
  const escapedTitle = escapeRegExp(headingTitle.trim());
  const markdownHeading = new RegExp(
    `^#{1,3}\\s+(?:\\*\\*)?${escapedTitle}(?:\\*\\*)?\\s*$`,
    "im"
  );
  const markdownMatch = markdownHeading.exec(evaluatorMarkdown);
  if (markdownMatch) {
    return extractSectionAfterHeadingMatch(evaluatorMarkdown, markdownMatch);
  }

  const boldHeading = new RegExp(
    `^\\s*(?:\\*\\*)?${escapedTitle}(?:\\*\\*)?\\s*$`,
    "im"
  );
  const boldMatch = boldHeading.exec(evaluatorMarkdown);
  if (boldMatch) {
    return extractSectionAfterHeadingMatch(evaluatorMarkdown, boldMatch);
  }

  return null;
}

function resolveMatchScoreRegion(
  evaluatorMarkdown: string,
  headingTitle: string,
  navLocale: RecruiterNavLocale
): string {
  const fromHeading = extractMatchScoreGuidanceSection(
    evaluatorMarkdown,
    headingTitle
  );
  if (fromHeading) return fromHeading;

  const fuzzyHeading = evaluatorMarkdown.search(
    new RegExp(escapeRegExp(headingTitle.trim()), "i")
  );
  if (fuzzyHeading >= 0) {
    return evaluatorMarkdown.slice(
      fuzzyHeading,
      fuzzyHeading + MATCH_SCORE_REGION_MAX_CHARS
    );
  }

  for (const label of scoreLabelsForLocale(navLocale)) {
    const labelIdx = evaluatorMarkdown.search(
      new RegExp(escapeRegExp(label), "i")
    );
    if (labelIdx >= 0) {
      return evaluatorMarkdown.slice(
        Math.max(0, labelIdx - 120),
        labelIdx + MATCH_SCORE_REGION_MAX_CHARS
      );
    }
  }

  return evaluatorMarkdown.slice(-MATCH_SCORE_REGION_MAX_CHARS);
}

function parseIntegerScoreFromFragment(fragment: string): number | null {
  const slashMatch = fragment.match(/(\d{1,2})\s*\/\s*10\b/);
  if (slashMatch) {
    const parsed = Number.parseInt(slashMatch[1], 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      return parsed;
    }
  }

  const bareMatch = fragment.match(/:\s*(\d{1,2})\b/);
  if (bareMatch) {
    const parsed = Number.parseInt(bareMatch[1], 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      return parsed;
    }
  }

  return null;
}

function parseLabeledIntegerScore(
  section: string,
  label: string
): number | null {
  const escapedLabel = escapeRegExp(label);
  const patterns = [
    new RegExp(
      `(?:^|\\n)\\s*-\\s*(?:\\*\\*)?${escapedLabel}(?:\\*\\*)?\\s*:?[^\\n]{0,160}`,
      "im"
    ),
    new RegExp(
      `(?:^|\\n)\\s*(?:\\*\\*)?${escapedLabel}(?:\\*\\*)?\\s*:?[^\\n]{0,160}`,
      "im"
    ),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(section);
    if (!match) continue;
    const score = parseIntegerScoreFromFragment(match[0]);
    if (score !== null) return score;
  }
  return null;
}

function scoreLabelsForLocale(navLocale: RecruiterNavLocale): string[] {
  const labels = RECRUITER_EVIDENCE_EVALUATOR_LABELS[navLocale];
  const primary = labels.recommendedMatchStrengthLabel;
  if (navLocale === "en") {
    return [
      primary,
      ...ENGLISH_SCORE_LABEL_ALIASES.filter((alias) => alias !== primary),
    ];
  }
  return [primary];
}

function parseTechnicalFitFromKeywordContext(markdown: string): number | null {
  const keywordPattern =
    /(?:recommended\s+match|match\s+strength|technical\s+fit|technical\s+\/\s+portfolio|pontuação|puntuación|punteggio)[^\n]{0,100}?(\d{1,2})\s*\/\s*10/gi;
  let lastScore: number | null = null;
  for (const match of markdown.matchAll(keywordPattern)) {
    const parsed = Number.parseInt(match[1], 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      lastScore = parsed;
    }
  }
  return lastScore;
}

function parseTechnicalFitCeiling(
  section: string,
  fullMarkdown: string,
  navLocale: RecruiterNavLocale
): number | null {
  for (const label of scoreLabelsForLocale(navLocale)) {
    const score = parseLabeledIntegerScore(section, label);
    if (score !== null) return score;
  }

  const fromKeywords = parseTechnicalFitFromKeywordContext(section);
  if (fromKeywords !== null) return fromKeywords;

  const firstSlashScore = section.match(/(\d{1,2})\s*\/\s*10\b/);
  if (firstSlashScore) {
    const parsed = Number.parseInt(firstSlashScore[1], 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      return parsed;
    }
  }

  const fromFullDocKeywords = parseTechnicalFitFromKeywordContext(fullMarkdown);
  if (fromFullDocKeywords !== null) return fromFullDocKeywords;

  const allScores = [...fullMarkdown.matchAll(/(\d{1,2})\s*\/\s*10\b/g)];
  if (allScores.length > 0) {
    const parsed = Number.parseInt(allScores[allScores.length - 1][1], 10);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 10) {
      return parsed;
    }
  }

  return null;
}

function parseLabeledConfidence(
  section: string,
  label: string,
  navLocale: RecruiterNavLocale
): ChartEvidenceConfidence | null {
  const escapedLabel = escapeRegExp(label);
  const patterns = [
    new RegExp(
      `(?:^|\\n)\\s*-\\s*(?:\\*\\*)?${escapedLabel}(?:\\*\\*)?\\s*:?\\s*([^\\n]+)`,
      "im"
    ),
    new RegExp(
      `(?:^|\\n)\\s*(?:\\*\\*)?${escapedLabel}(?:\\*\\*)?\\s*:?\\s*([^\\n]+)`,
      "im"
    ),
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(section);
    if (!match) continue;
    const rawValue = match[1].trim();
    const tokenOnly = rawValue.split(/[—\-,.;]/)[0]?.trim() ?? rawValue;
    const mapped = mapLocaleConfidenceToCanonical(tokenOnly, navLocale);
    if (mapped) return mapped;
    const wordMatch = tokenOnly.match(
      /\b(high|medium|low|alta|média|media|baja|bassa)\b/i
    );
    if (wordMatch) {
      const fromWord = mapLocaleConfidenceToCanonical(wordMatch[1], navLocale);
      if (fromWord) return fromWord;
    }
  }
  return null;
}

function parseEvidenceConfidence(
  section: string,
  fullMarkdown: string,
  navLocale: RecruiterNavLocale
): ChartEvidenceConfidence | null {
  const labels = RECRUITER_EVIDENCE_EVALUATOR_LABELS[navLocale];
  const fromLabel = parseLabeledConfidence(
    section,
    labels.evidenceConfidenceLabel,
    navLocale
  );
  if (fromLabel) return fromLabel;

  const conf = RECRUITER_EVIDENCE_CONFIDENCE_TOKENS[navLocale];
  const searchTargets = [
    section,
    fullMarkdown.slice(-MATCH_SCORE_REGION_MAX_CHARS),
  ];
  const tokenPatterns = [
    conf.high,
    conf.medium,
    conf.low,
    "High",
    "Medium",
    "Low",
  ];

  for (const target of searchTargets) {
    for (const token of tokenPatterns) {
      const pattern = new RegExp(
        `(?:^|\\n)\\s*(?:-\\s*)?(?:\\*\\*)?${escapeRegExp(labels.evidenceConfidenceLabel)}(?:\\*\\*)?\\s*:?\\s*(?:\\*\\*)?${escapeRegExp(token)}(?:\\*\\*)?\\b`,
        "im"
      );
      if (pattern.test(target)) {
        const mapped = mapLocaleConfidenceToCanonical(token, navLocale);
        if (mapped) return mapped;
      }
    }
  }

  return null;
}

/**
 * Parses authoritative match metadata from evaluator markdown. Returns null when
 * required fields cannot be read reliably.
 */
export function parseEvaluatorMatchMetadata(
  evaluatorMarkdown: string,
  navLocale: RecruiterNavLocale
): EvaluatorMatchMetadata | null {
  const labels = RECRUITER_EVIDENCE_EVALUATOR_LABELS[navLocale];
  const section = resolveMatchScoreRegion(
    evaluatorMarkdown,
    labels.headingMatchScoreGuidance,
    navLocale
  );

  const technicalFitCeiling = parseTechnicalFitCeiling(
    section,
    evaluatorMarkdown,
    navLocale
  );
  if (technicalFitCeiling === null) return null;

  const evidenceConfidence = parseEvidenceConfidence(
    section,
    evaluatorMarkdown,
    navLocale
  );
  if (!evidenceConfidence) return null;

  return { technicalFitCeiling, evidenceConfidence };
}
