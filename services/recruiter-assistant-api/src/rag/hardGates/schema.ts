import { z } from "zod";

export const HARD_GATE_CATEGORIES = [
  "spoken_language",
  "work_authorization",
  "location",
  "timezone",
  "hybrid_onsite",
  "travel",
  "employment_type",
  "primary_stack",
  "specialist_domain",
] as const;

export const EVIDENCE_LEVELS = [
  "direct",
  "adjacent",
  "not_evidenced",
  "contradictory",
] as const;

export const REQUIREMENT_IMPORTANCE = ["must_have", "nice_to_have"] as const;

export const RECOMMENDATION_LABELS = [
  "strong_pursue",
  "pursue",
  "maybe_validate",
  "weak_fit",
  "skip",
] as const;

export type HardGateCategory = (typeof HARD_GATE_CATEGORIES)[number];
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];
export type RequirementImportance = (typeof REQUIREMENT_IMPORTANCE)[number];
export type RecommendationLabel = (typeof RECOMMENDATION_LABELS)[number];

export type HardGateRequirementRow = {
  requirement: string;
  category: HardGateCategory;
  evidenceLevel: EvidenceLevel;
  requirementImportance: RequirementImportance;
  isHardGate: boolean;
  severity: "major" | "moderate" | "minor";
  jdSuggestsFlexibility: boolean;
  rationale: string;
  sourceRequirementText?: string;
};

export type HardGateAssessment = {
  missingHardGateCount: number;
  missingPracticalGateCount: number;
  missingPrimaryStackGateCount: number;
  maxTechnicalFit: number;
  evaluatorRecommendedFit: number | null;
  effectiveMaxTechnicalFit: number;
  allowedRecommendations: RecommendationLabel[];
  blockedRecommendations: Array<"strong_pursue" | "pursue">;
  reasons: HardGateRequirementRow[];
  rulesFired: string[];
  hasHardGateMiss: boolean;
  shouldOpenVerdictWithCaution: boolean;
};

const hardGateCategorySchema = z.enum(HARD_GATE_CATEGORIES);
const evidenceLevelSchema = z.enum(EVIDENCE_LEVELS);
const requirementImportanceSchema = z.enum(REQUIREMENT_IMPORTANCE);
const severitySchema = z.enum(["major", "moderate", "minor"]);

export const hardGateRequirementRowSchema = z.object({
  requirement: z.string().min(2),
  category: hardGateCategorySchema,
  evidenceLevel: evidenceLevelSchema,
  requirementImportance: requirementImportanceSchema,
  isHardGate: z.boolean(),
  severity: severitySchema,
  jdSuggestsFlexibility: z.boolean(),
  rationale: z.string().min(2),
  sourceRequirementText: z.string().min(2).optional(),
});

export const hardGateExtractionSchema = z.object({
  rows: z.array(hardGateRequirementRowSchema).max(24),
});

export type HardGateExtractionResult = z.infer<typeof hardGateExtractionSchema>;

/** Specialist-domain caps aligned with EVIDENCE_EVALUATOR_HARD_CAP_RULES_EN. */
export const SPECIALIST_DOMAIN_CAPS: Readonly<
  Record<string, { maxFit: number; ruleId: string }>
> = {
  ml_model_validation: {
    maxFit: 5,
    ruleId: "specialist_ml_model_validation_cap_5",
  },
  ai_governance_compliance: {
    maxFit: 6,
    ruleId: "specialist_ai_governance_cap_6",
  },
  data_science_training: {
    maxFit: 5,
    ruleId: "specialist_data_science_cap_5",
  },
  people_management: {
    maxFit: 6,
    ruleId: "specialist_people_management_cap_6",
  },
};

export const PRACTICAL_GATE_CATEGORIES: ReadonlySet<HardGateCategory> = new Set(
  [
    "spoken_language",
    "work_authorization",
    "location",
    "timezone",
    "hybrid_onsite",
    "travel",
    "employment_type",
  ]
);

export const ROLE_DEFINING_CATEGORIES: ReadonlySet<HardGateCategory> = new Set([
  "primary_stack",
  "specialist_domain",
]);

export function isEvidenceMissing(level: EvidenceLevel): boolean {
  return level === "not_evidenced" || level === "adjacent";
}
