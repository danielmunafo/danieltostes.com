/** Localized recommendation labels (en) — mirrors src/messages/en.json RecruiterAssistant. */
export const RECRUITER_E2E_RECOMMENDATION_LABELS = {
  strongPursue: "Strong pursue",
  pursue: "Pursue",
  maybe: "Maybe / validate first",
  weakFit: "Weak fit",
  skip: "Skip",
} as const;

export const RECRUITER_E2E_CONFIDENCE_LABELS = {
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;

export type RecruiterMatchExpectation = {
  readonly recommendations: readonly string[];
  readonly technicalFitMin: number;
  readonly technicalFitMax: number;
  readonly evidenceConfidences: readonly string[];
};

export const RECRUITER_MATCH_EXPECTATIONS = {
  perfection: {
    recommendations: [
      RECRUITER_E2E_RECOMMENDATION_LABELS.strongPursue,
      RECRUITER_E2E_RECOMMENDATION_LABELS.pursue,
      RECRUITER_E2E_RECOMMENDATION_LABELS.maybe,
    ],
    technicalFitMin: 6,
    technicalFitMax: 10,
    evidenceConfidences: [
      RECRUITER_E2E_CONFIDENCE_LABELS.high,
      RECRUITER_E2E_CONFIDENCE_LABELS.medium,
    ],
  },
  ok: {
    recommendations: [
      RECRUITER_E2E_RECOMMENDATION_LABELS.pursue,
      RECRUITER_E2E_RECOMMENDATION_LABELS.maybe,
    ],
    technicalFitMin: 5,
    technicalFitMax: 7,
    evidenceConfidences: [
      RECRUITER_E2E_CONFIDENCE_LABELS.medium,
      RECRUITER_E2E_CONFIDENCE_LABELS.low,
    ],
  },
  badMatch: {
    recommendations: [
      RECRUITER_E2E_RECOMMENDATION_LABELS.weakFit,
      RECRUITER_E2E_RECOMMENDATION_LABELS.maybe,
      RECRUITER_E2E_RECOMMENDATION_LABELS.skip,
    ],
    technicalFitMin: 2,
    technicalFitMax: 5,
    evidenceConfidences: [
      RECRUITER_E2E_CONFIDENCE_LABELS.medium,
      RECRUITER_E2E_CONFIDENCE_LABELS.low,
    ],
  },
  completeMismatch: {
    recommendations: [
      RECRUITER_E2E_RECOMMENDATION_LABELS.skip,
      RECRUITER_E2E_RECOMMENDATION_LABELS.weakFit,
    ],
    technicalFitMin: 0,
    technicalFitMax: 4,
    evidenceConfidences: [
      RECRUITER_E2E_CONFIDENCE_LABELS.high,
      RECRUITER_E2E_CONFIDENCE_LABELS.medium,
      RECRUITER_E2E_CONFIDENCE_LABELS.low,
    ],
  },
} as const satisfies Record<string, RecruiterMatchExpectation>;

export type RecruiterMatchScenario = keyof typeof RECRUITER_MATCH_EXPECTATIONS;
