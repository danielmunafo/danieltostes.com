import {
  RECRUITER_EXECUTIVE_BRIEF_HEADINGS,
  type RecruiterNavLocale,
} from "../../constants.js";
import { logInfo } from "../../logging/logger.js";
import {
  localizedRecommendationToKey,
  recommendationKeyToLocalizedLabel,
} from "./formatHardGateBlock.js";
import { getRecommendedReplacementRecommendation } from "./getRecommendedReplacementRecommendation.js";
import type { HardGateAssessment } from "./schema.js";

export type PitchHardGateClampResult = {
  text: string;
  clamped: boolean;
  technicalFitClamped: boolean;
  recommendationClamped: boolean;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseTechnicalFitScore(
  scoresSection: string,
  navLocale: RecruiterNavLocale
): { value: number; lineIndex: number; line: string } | null {
  const headings = RECRUITER_EXECUTIVE_BRIEF_HEADINGS[navLocale];
  const pattern = new RegExp(
    `(^|\\n)(\\s*[-*]?\\s*\\*\\*Technical fit:\\*\\*|\\s*[-*]?\\s*\\*\\*${escapeRegExp(headings.scores === "Punteggi" ? "Aderenza tecnica" : "Technical fit")}:\\*\\*)\\s*(\\d{1,2})\\s*/\\s*10`,
    "im"
  );
  const enPattern = /Technical fit:\s*(\d{1,2})\s*\/\s*10/i;
  const match =
    scoresSection.match(enPattern) ??
    scoresSection.match(
      new RegExp(
        `${escapeRegExp(headings.scores)}[\\s\\S]*?(\\d{1,2})\\s*/\\s*10`
      )
    );
  if (!match) {
    const simple = scoresSection.match(/(\d{1,2})\s*\/\s*10/);
    if (!simple) return null;
    const value = Number.parseInt(simple[1], 10);
    if (!Number.isFinite(value)) return null;
    const lineIndex = scoresSection
      .split("\n")
      .findIndex((line) => /\d{1,2}\s*\/\s*10/.test(line));
    return {
      value,
      lineIndex,
      line: scoresSection.split("\n")[lineIndex] ?? "",
    };
  }
  const value = Number.parseInt(match[1], 10);
  const lines = scoresSection.split("\n");
  const lineIndex = lines.findIndex(
    (line) =>
      /Technical fit|Aderenza|Puntuación|Punteggio/i.test(line) &&
      /\d{1,2}\s*\/\s*10/.test(line)
  );
  return {
    value,
    lineIndex: lineIndex >= 0 ? lineIndex : 0,
    line: lines[lineIndex >= 0 ? lineIndex : 0] ?? match[0],
  };
}

function extractScoresSection(
  assistantText: string,
  navLocale: RecruiterNavLocale
): string | null {
  const scoresHeading = `# ${RECRUITER_EXECUTIVE_BRIEF_HEADINGS[navLocale].scores}`;
  const scoresIndex = assistantText.indexOf(scoresHeading);
  if (scoresIndex < 0) return null;
  const afterScores = assistantText.slice(scoresIndex + scoresHeading.length);
  const nextHeading = afterScores.search(/\n# /);
  return nextHeading >= 0 ? afterScores.slice(0, nextHeading) : afterScores;
}

function replaceTechnicalFit(
  assistantText: string,
  navLocale: RecruiterNavLocale,
  cappedScore: number
): string {
  const fitLabels = [
    "Technical fit",
    "Aderência técnica",
    "Aderencia técnica",
    "Encaje técnico",
    "Aderenza tecnica",
  ];
  for (const label of fitLabels) {
    const pattern = new RegExp(
      `(\\*\\*${escapeRegExp(label)}:\\*\\*\\s*)(\\d{1,2})(\\s*/\\s*10)`,
      "i"
    );
    if (pattern.test(assistantText)) {
      return assistantText.replace(pattern, `$1${cappedScore}$3`);
    }
  }
  return assistantText.replace(
    /(Technical fit:\s*)(\d{1,2})(\s*\/\s*10)/i,
    `$1${cappedScore}$3`
  );
}

function replaceRecommendation(
  assistantText: string,
  navLocale: RecruiterNavLocale,
  replacementLabel: string
): string {
  const recLabels = [
    "Recommendation",
    "Recomendação",
    "Recomendación",
    "Raccomandazione",
  ];
  for (const label of recLabels) {
    const pattern = new RegExp(
      `(\\*\\*${escapeRegExp(label)}:\\*\\*\\s*\\*\\*)([^*]+)(\\*\\*)`,
      "i"
    );
    if (pattern.test(assistantText)) {
      return assistantText.replace(pattern, `$1${replacementLabel}$3`);
    }
    const plainPattern = new RegExp(
      `(\\*\\*${escapeRegExp(label)}:\\*\\*\\s*)([^\\n]+)`,
      "i"
    );
    if (plainPattern.test(assistantText)) {
      return assistantText.replace(plainPattern, `$1**${replacementLabel}**`);
    }
  }
  return assistantText;
}

/**
 * Clamps pitch Technical fit and Recommendation to hard-gate assessment limits.
 */
export function validateAndClampPitchHardGates(
  assistantText: string,
  assessment: HardGateAssessment,
  navLocale: RecruiterNavLocale
): PitchHardGateClampResult {
  let text = assistantText;
  let technicalFitClamped = false;
  let recommendationClamped = false;

  const scoresSection = extractScoresSection(text, navLocale);
  if (scoresSection) {
    const parsed = parseTechnicalFitScore(scoresSection, navLocale);
    if (parsed && parsed.value > assessment.effectiveMaxTechnicalFit) {
      text = replaceTechnicalFit(
        text,
        navLocale,
        assessment.effectiveMaxTechnicalFit
      );
      technicalFitClamped = true;
    }
  }

  const recHeadingPatterns = [
    /\*\*Recommendation:\*\*\s*\*\*([^*]+)\*\*/i,
    /\*\*Recommendation:\*\*\s*([^\n]+)/i,
    /\*\*Recomendação:\*\*\s*\*\*([^*]+)\*\*/i,
    /\*\*Recomendación:\*\*\s*\*\*([^*]+)\*\*/i,
    /\*\*Raccomandazione:\*\*\s*\*\*([^*]+)\*\*/i,
  ];

  for (const pattern of recHeadingPatterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const localized = match[1].trim();
    const key = localizedRecommendationToKey(localized, navLocale);
    if (!key) continue;
    if (assessment.blockedRecommendations.includes(key)) {
      const replacement = getRecommendedReplacementRecommendation(assessment);
      const replacementLabel = recommendationKeyToLocalizedLabel(
        replacement,
        navLocale
      );
      text = replaceRecommendation(text, navLocale, replacementLabel);
      recommendationClamped = true;
    } else if (!assessment.allowedRecommendations.includes(key)) {
      const replacement = getRecommendedReplacementRecommendation(assessment);
      const replacementLabel = recommendationKeyToLocalizedLabel(
        replacement,
        navLocale
      );
      text = replaceRecommendation(text, navLocale, replacementLabel);
      recommendationClamped = true;
    }
    break;
  }

  const clamped = technicalFitClamped || recommendationClamped;
  if (clamped) {
    logInfo("hardGateClamp", "pitch output clamped to hard gate assessment", {
      navLocale,
      technicalFitClamped,
      recommendationClamped,
      effectiveMaxTechnicalFit: assessment.effectiveMaxTechnicalFit,
      rulesFired: assessment.rulesFired,
    });
  }

  if (assessment.shouldOpenVerdictWithCaution) {
    const verdictHeading = `# ${RECRUITER_EXECUTIVE_BRIEF_HEADINGS[navLocale].verdict}`;
    const verdictIndex = text.indexOf(verdictHeading);
    if (verdictIndex >= 0) {
      const afterVerdict = text.slice(verdictIndex + verdictHeading.length);
      const firstParagraph = afterVerdict.split("\n\n")[0] ?? "";
      const isUnqualifiedStrong =
        /\b(strong match|excelente encaje|forte aderência|ottimo match)\b/i.test(
          firstParagraph
        ) &&
        !/\b(however|but|although|porém|però|sin embargo)\b/i.test(
          firstParagraph
        );
      if (isUnqualifiedStrong) {
        logInfo(
          "hardGateClamp",
          "verdict may overstate fit; prompt clamp only",
          {
            navLocale,
          }
        );
      }
    }
  }

  return {
    text,
    clamped,
    technicalFitClamped,
    recommendationClamped,
  };
}
