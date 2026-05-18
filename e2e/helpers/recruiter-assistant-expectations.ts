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

const ALL_EVIDENCE_CONFIDENCES = [
  RECRUITER_E2E_CONFIDENCE_LABELS.high,
  RECRUITER_E2E_CONFIDENCE_LABELS.medium,
  RECRUITER_E2E_CONFIDENCE_LABELS.low,
] as const;

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
    technicalFitMin: 5,
    technicalFitMax: 10,
    evidenceConfidences: ALL_EVIDENCE_CONFIDENCES,
  },
  ok: {
    recommendations: [
      RECRUITER_E2E_RECOMMENDATION_LABELS.pursue,
      RECRUITER_E2E_RECOMMENDATION_LABELS.maybe,
      RECRUITER_E2E_RECOMMENDATION_LABELS.weakFit,
    ],
    technicalFitMin: 4,
    technicalFitMax: 8,
    evidenceConfidences: ALL_EVIDENCE_CONFIDENCES,
  },
  badMatch: {
    recommendations: [
      RECRUITER_E2E_RECOMMENDATION_LABELS.weakFit,
      RECRUITER_E2E_RECOMMENDATION_LABELS.maybe,
      RECRUITER_E2E_RECOMMENDATION_LABELS.skip,
    ],
    technicalFitMin: 1,
    technicalFitMax: 6,
    evidenceConfidences: ALL_EVIDENCE_CONFIDENCES,
  },
  completeMismatch: {
    recommendations: [
      RECRUITER_E2E_RECOMMENDATION_LABELS.skip,
      RECRUITER_E2E_RECOMMENDATION_LABELS.weakFit,
      RECRUITER_E2E_RECOMMENDATION_LABELS.maybe,
    ],
    technicalFitMin: 0,
    technicalFitMax: 5,
    evidenceConfidences: ALL_EVIDENCE_CONFIDENCES,
  },
} as const satisfies Record<string, RecruiterMatchExpectation>;

export type RecruiterMatchScenario = keyof typeof RECRUITER_MATCH_EXPECTATIONS;
