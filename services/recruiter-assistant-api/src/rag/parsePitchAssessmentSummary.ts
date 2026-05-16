import {
  RECRUITER_EVIDENCE_CONFIDENCE_TOKENS,
  RECRUITER_EXECUTIVE_BRIEF_HEADINGS,
  type RecruiterNavLocale,
} from "../constants.js";
import {
  type ChartEvidenceConfidence,
  type ChartRecommendation,
  CHART_EVIDENCE_CONFIDENCE,
  CHART_RECOMMENDATION,
} from "./chartDataSchema.js";
import {
  localizedRecommendationToKey,
  recommendationKeyToLocalizedLabel,
} from "./hardGates/formatHardGateBlock.js";
import type { RecommendationLabel } from "./hardGates/schema.js";

export type PitchAssessmentSummary = {
  readonly technicalFit: number;
  readonly evidenceConfidence: ChartEvidenceConfidence;
  readonly recommendation: ChartRecommendation;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function parseTechnicalFit(
  scoresSection: string,
  navLocale: RecruiterNavLocale
): number | null {
  const headings = RECRUITER_EXECUTIVE_BRIEF_HEADINGS[navLocale];
  const fitLabels = [
    "Technical fit",
    "Aderência técnica",
    "Aderencia técnica",
    "Encaje técnico",
    "Aderenza tecnica",
    headings.scores === "Punteggi" ? "Aderenza tecnica" : "Technical fit",
  ];
  for (const label of fitLabels) {
    const pattern = new RegExp(
      `(?:\\*\\*)?${escapeRegExp(label)}(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?\\s*(\\d{1,2})\\s*/\\s*10`,
      "i"
    );
    const match = scoresSection.match(pattern);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      if (Number.isFinite(value) && value >= 0 && value <= 10) {
        return value;
      }
    }
  }
  return null;
}

function mapLocaleConfidenceToCanonical(
  token: string,
  navLocale: RecruiterNavLocale
): ChartEvidenceConfidence | null {
  const normalized = token.replace(/\*/g, "").trim();
  const conf = RECRUITER_EVIDENCE_CONFIDENCE_TOKENS[navLocale];
  if (normalized === conf.high) return "High";
  if (normalized === conf.medium) return "Medium";
  if (normalized === conf.low) return "Low";
  if (/^high$/i.test(normalized)) return "High";
  if (/^medium$/i.test(normalized)) return "Medium";
  if (/^low$/i.test(normalized)) return "Low";
  return null;
}

function parseEvidenceConfidence(
  scoresSection: string,
  navLocale: RecruiterNavLocale
): ChartEvidenceConfidence | null {
  const confLabels = [
    "Evidence confidence",
    "Confiança nas evidências",
    "Confianza en la evidencia",
    "Affidabilità delle evidenze",
  ];
  for (const label of confLabels) {
    const pattern = new RegExp(
      `(?:\\*\\*)?${escapeRegExp(label)}(?:\\*\\*)?\\s*:\\s*(?:\\*\\*)?\\s*([^\\n]+)`,
      "i"
    );
    const match = scoresSection.match(pattern);
    if (!match) continue;
    const raw = match[1].replace(/\*\*/g, "").trim();
    const tokenOnly = raw.split(/[—\-,.;]/)[0]?.trim() ?? raw;
    const mapped = mapLocaleConfidenceToCanonical(tokenOnly, navLocale);
    if (mapped) return mapped;
  }
  for (const level of CHART_EVIDENCE_CONFIDENCE) {
    if (new RegExp(`\\b${level}\\b`, "i").test(scoresSection)) {
      return level;
    }
  }
  return null;
}

function recommendationKeyToChartLabel(
  key: RecommendationLabel
): ChartRecommendation {
  const map: Record<RecommendationLabel, ChartRecommendation> = {
    strong_pursue: "Strong pursue",
    pursue: "Pursue",
    maybe_validate: "Maybe / validate first",
    weak_fit: "Weak fit",
    skip: "Skip",
  };
  return map[key];
}

function parseRecommendation(
  scoresSection: string,
  navLocale: RecruiterNavLocale
): ChartRecommendation | null {
  const recLabels = [
    "Recommendation",
    "Recomendação",
    "Recomendación",
    "Raccomandazione",
  ];
  for (const label of recLabels) {
    const boldWrappedPattern = new RegExp(
      `(?:\\*\\*)?${escapeRegExp(label)}(?:\\*\\*)?\\s*:\\s*\\*\\*([^*]+)\\*\\*`,
      "i"
    );
    const boldWrappedMatch = scoresSection.match(boldWrappedPattern);
    if (boldWrappedMatch) {
      const key = localizedRecommendationToKey(
        boldWrappedMatch[1].trim(),
        navLocale
      );
      if (key) return recommendationKeyToChartLabel(key);
    }
    const plainPattern = new RegExp(
      `(?:\\*\\*)?${escapeRegExp(label)}(?:\\*\\*)?\\s*:\\s*([^\\n]+)`,
      "i"
    );
    const plainMatch = scoresSection.match(plainPattern);
    if (plainMatch) {
      const key = localizedRecommendationToKey(
        plainMatch[1].replace(/\*/g, "").trim(),
        navLocale
      );
      if (key) return recommendationKeyToChartLabel(key);
    }
  }
  for (const chartRec of CHART_RECOMMENDATION) {
    const key = localizedRecommendationToKey(chartRec, "en");
    if (!key) continue;
    const localized = recommendationKeyToLocalizedLabel(key, navLocale);
    if (
      new RegExp(`Recommendation[^\\n]*${escapeRegExp(localized)}`, "i").test(
        scoresSection
      )
    ) {
      return chartRec;
    }
  }
  return null;
}

/**
 * Parses authoritative assessment summary fields from the pitch `# Scores` section.
 */
export function parsePitchAssessmentSummary(
  assistantText: string,
  navLocale: RecruiterNavLocale
): PitchAssessmentSummary | null {
  const scoresSection = extractScoresSection(assistantText, navLocale);
  if (!scoresSection) return null;

  const technicalFit = parseTechnicalFit(scoresSection, navLocale);
  const evidenceConfidence = parseEvidenceConfidence(scoresSection, navLocale);
  const recommendation = parseRecommendation(scoresSection, navLocale);

  if (
    technicalFit === null ||
    evidenceConfidence === null ||
    recommendation === null
  ) {
    return null;
  }

  return { technicalFit, evidenceConfidence, recommendation };
}
