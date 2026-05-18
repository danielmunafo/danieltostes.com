import { z } from "zod";

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

export const assessmentSummarySchema = z.object({
  technicalFit: z.number().int().min(0).max(10),
  evidenceConfidence: z.enum(CHART_EVIDENCE_CONFIDENCE),
  recommendation: z.enum(CHART_RECOMMENDATION),
});

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

export const capabilityDimensionKeySchema = z.enum(CAPABILITY_DIMENSION_KEYS);

export const CAPABILITY_EVIDENCE_LEVELS = [
  "direct",
  "adjacent",
  "not_evidenced",
  "mixed",
] as const;

export type CapabilityEvidenceLevel =
  (typeof CAPABILITY_EVIDENCE_LEVELS)[number];

/** Display label for a radar axis (keep short to limit chart JSON size). */
export const CAPABILITY_DIMENSION_LABEL_MAX_LENGTH = 56;

/** Per-axis rationale tied to evaluator rows (compact for token budget). */
export const CAPABILITY_DIMENSION_RATIONALE_MAX_LENGTH = 120;

export const capabilityDimensionSchema = z.object({
  key: capabilityDimensionKeySchema,
  label: z.string().min(1).max(CAPABILITY_DIMENSION_LABEL_MAX_LENGTH),
  score: z.number().int().min(0).max(10),
  evidenceLevel: z.enum(CAPABILITY_EVIDENCE_LEVELS),
  rationale: z.string().min(1).max(CAPABILITY_DIMENSION_RATIONALE_MAX_LENGTH),
});

export const chartDataSchema = z.object({
  assessmentSummary: assessmentSummarySchema,
  capabilityDimensions: z.array(capabilityDimensionSchema).min(4).max(10),
});

export type AssessmentSummary = z.infer<typeof assessmentSummarySchema>;
export type CapabilityDimension = z.infer<typeof capabilityDimensionSchema>;
export type ChartData = z.infer<typeof chartDataSchema>;

/**
 * Maps model-invented or legacy dimension keys to the canonical enum before
 * schema validation (generateObject / streamed chart repair).
 */
const CAPABILITY_DIMENSION_KEY_ALIASES: Readonly<
  Record<string, CapabilityDimensionKey>
> = {
  developerExperience: "integrations",
};

function remapChartCapabilityDimensionKeys(data: unknown): unknown {
  if (typeof data !== "object" || data === null) return data;
  const chart = data as Record<string, unknown>;
  const dims = chart.capabilityDimensions;
  if (!Array.isArray(dims)) return data;
  return {
    ...chart,
    capabilityDimensions: dims.map((dim) => {
      if (typeof dim !== "object" || dim === null) return dim;
      const row = dim as Record<string, unknown>;
      const key = row.key;
      if (typeof key !== "string") return dim;
      const mapped = CAPABILITY_DIMENSION_KEY_ALIASES[key];
      if (mapped === undefined) return dim;
      return { ...row, key: mapped };
    }),
  };
}

/** Use with `generateObject` so minor key drift still validates as `ChartData`. */
export const chartDataSchemaForModelOutput = z.preprocess(
  remapChartCapabilityDimensionKeys,
  chartDataSchema
);
