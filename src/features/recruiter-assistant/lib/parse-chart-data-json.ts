import type { ChartData } from "./chart-data-types";
import {
  CHART_EVIDENCE_CONFIDENCE,
  CHART_RECOMMENDATION,
} from "./chart-data-types";
import { CAPABILITY_DIMENSION_KEYS } from "./chart-data-types";
import {
  RECRUITER_CHART_DIMENSION_LABEL_MAX_LENGTH,
  RECRUITER_CHART_DIMENSION_RATIONALE_MAX_LENGTH,
} from "../constants/recruiter-assistant";

/** Keep aligned with API `chartDataSchema` alias map. */
const CAPABILITY_DIMENSION_KEY_ALIASES: Readonly<Record<string, string>> = {
  developerExperience: "integrations",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCapabilityEvidenceLevel(
  value: unknown
): value is ChartData["capabilityDimensions"][number]["evidenceLevel"] {
  return (
    value === "direct" ||
    value === "adjacent" ||
    value === "not_evidenced" ||
    value === "mixed"
  );
}

type CapabilityDimension = ChartData["capabilityDimensions"][number];

/**
 * Lightweight client-side parse for streamed chart JSON (API already validated).
 * Returns null on malformed payloads so the UI never renders partial/invalid data.
 */
export function parseChartDataJson(jsonText: string): ChartData | null {
  try {
    const raw: unknown = JSON.parse(jsonText);
    if (!isRecord(raw)) return null;

    const summary = raw.assessmentSummary;
    if (!isRecord(summary)) return null;

    const technicalFit = summary.technicalFit;
    if (
      typeof technicalFit !== "number" ||
      !Number.isInteger(technicalFit) ||
      technicalFit < 0 ||
      technicalFit > 10
    ) {
      return null;
    }

    const evidenceConfidence = summary.evidenceConfidence;
    if (
      typeof evidenceConfidence !== "string" ||
      !(CHART_EVIDENCE_CONFIDENCE as readonly string[]).includes(
        evidenceConfidence
      )
    ) {
      return null;
    }

    const recommendation = summary.recommendation;
    if (
      typeof recommendation !== "string" ||
      !(CHART_RECOMMENDATION as readonly string[]).includes(recommendation)
    ) {
      return null;
    }

    const dimsRaw = raw.capabilityDimensions;
    if (!Array.isArray(dimsRaw) || dimsRaw.length < 4 || dimsRaw.length > 10) {
      return null;
    }

    const capabilityDimensions: CapabilityDimension[] = [];
    const seenKeys = new Set<string>();

    for (const item of dimsRaw) {
      if (!isRecord(item)) return null;
      const rawKey = item.key;
      if (typeof rawKey !== "string") return null;
      const aliased = CAPABILITY_DIMENSION_KEY_ALIASES[rawKey];
      const key = aliased !== undefined ? aliased : rawKey;
      if (!(CAPABILITY_DIMENSION_KEYS as readonly string[]).includes(key)) {
        return null;
      }
      if (seenKeys.has(key)) return null;
      seenKeys.add(key);

      const label = item.label;
      const score = item.score;
      const evidenceLevel = item.evidenceLevel;
      const rationale = item.rationale;

      if (
        typeof label !== "string" ||
        label.length === 0 ||
        label.length > RECRUITER_CHART_DIMENSION_LABEL_MAX_LENGTH
      ) {
        return null;
      }
      if (
        typeof score !== "number" ||
        !Number.isInteger(score) ||
        score < 0 ||
        score > 10
      ) {
        return null;
      }
      if (!isCapabilityEvidenceLevel(evidenceLevel)) return null;
      if (
        typeof rationale !== "string" ||
        rationale.length === 0 ||
        rationale.length > RECRUITER_CHART_DIMENSION_RATIONALE_MAX_LENGTH
      ) {
        return null;
      }

      capabilityDimensions.push({
        key: key as CapabilityDimension["key"],
        label,
        score,
        evidenceLevel,
        rationale,
      });
    }

    return {
      assessmentSummary: {
        technicalFit,
        evidenceConfidence:
          evidenceConfidence as ChartData["assessmentSummary"]["evidenceConfidence"],
        recommendation:
          recommendation as ChartData["assessmentSummary"]["recommendation"],
      },
      capabilityDimensions,
    };
  } catch {
    return null;
  }
}
