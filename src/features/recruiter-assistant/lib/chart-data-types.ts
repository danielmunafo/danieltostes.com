/** Mirrors API chart JSON shape (see chartDataSchema.ts in recruiter-assistant-api). */

export const CHART_EVIDENCE_CONFIDENCE = ["High", "Medium", "Low"] as const;
export type ChartEvidenceConfidence =
  (typeof CHART_EVIDENCE_CONFIDENCE)[number];

export const CHART_RECOMMENDATION = [
  "Strong pursue",
  "Pursue",
  "Maybe / validate first",
  "Weak fit",
  "Skip",
] as const;
export type ChartRecommendation = (typeof CHART_RECOMMENDATION)[number];

export type AssessmentSummary = {
  readonly technicalFit: number;
  readonly evidenceConfidence: ChartEvidenceConfidence;
  readonly recommendation: ChartRecommendation;
};

export const CAPABILITY_DIMENSION_KEYS = [
  "backendArchitecture",
  "frontendProductUi",
  "workflowOrchestration",
  "integrations",
  "cloudDevops",
  "reliabilityObservability",
  "aiNativeEngineering",
  "leadershipInfluence",
  "domainFit",
  "roleSpecificStackFit",
] as const;

export type CapabilityDimensionKey = (typeof CAPABILITY_DIMENSION_KEYS)[number];

export type CapabilityEvidenceLevel =
  | "direct"
  | "adjacent"
  | "not_evidenced"
  | "mixed";

export type CapabilityDimension = {
  readonly key: CapabilityDimensionKey;
  readonly label: string;
  readonly score: number;
  readonly evidenceLevel: CapabilityEvidenceLevel;
  readonly rationale: string;
};

export type ChartData = {
  readonly assessmentSummary: AssessmentSummary;
  readonly capabilityDimensions: readonly CapabilityDimension[];
};
