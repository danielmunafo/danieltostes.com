import {
  isEvidenceMissing,
  PRACTICAL_GATE_CATEGORIES,
  ROLE_DEFINING_CATEGORIES,
  SPECIALIST_DOMAIN_CAPS,
  type HardGateAssessment,
  type HardGateRequirementRow,
  type RecommendationLabel,
} from "./schema.js";

function missingMustHaveHardGates(
  rows: readonly HardGateRequirementRow[]
): HardGateRequirementRow[] {
  return rows.filter(
    (row) =>
      row.isHardGate &&
      row.requirementImportance === "must_have" &&
      isEvidenceMissing(row.evidenceLevel)
  );
}

function specialistCapFromRows(
  rows: readonly HardGateRequirementRow[]
): { cap: number; ruleId: string } | null {
  let strictest: { cap: number; ruleId: string } | null = null;
  for (const row of rows) {
    if (
      row.category !== "specialist_domain" ||
      !isEvidenceMissing(row.evidenceLevel)
    ) {
      continue;
    }
    const requirementLower = row.requirement.toLowerCase();
    for (const [key, config] of Object.entries(SPECIALIST_DOMAIN_CAPS)) {
      const matchesKey =
        requirementLower.includes(key.replace(/_/g, " ")) ||
        requirementLower.includes(key);
      if (!matchesKey) continue;
      if (!strictest || config.maxFit < strictest.cap) {
        strictest = { cap: config.maxFit, ruleId: config.ruleId };
      }
    }
  }
  return strictest;
}

function computeMaxTechnicalFit(missing: readonly HardGateRequirementRow[]): {
  maxTechnicalFit: number;
  rulesFired: string[];
} {
  const rulesFired: string[] = [];
  let cap = 10;

  const missingRoleDefining = missing.filter((row) =>
    ROLE_DEFINING_CATEGORIES.has(row.category)
  );
  const missingPractical = missing.filter((row) =>
    PRACTICAL_GATE_CATEGORIES.has(row.category)
  );
  const missingPrimaryStack = missing.filter(
    (row) => row.category === "primary_stack"
  );
  const hasFlexibilityOnAnyMissing = missing.some(
    (row) => row.jdSuggestsFlexibility
  );

  if (missingPractical.length >= 1 && missing.length >= 2) {
    cap = Math.min(cap, 4);
    rulesFired.push("practical_plus_other_hard_gate_cap_4");
  }

  if (missingRoleDefining.length >= 2) {
    cap = Math.min(cap, 5);
    rulesFired.push("two_role_defining_gates_missing_cap_5");
  }

  if (missingPrimaryStack.length >= 1) {
    cap = Math.min(cap, 5);
    rulesFired.push("primary_stack_missing_cap_5");
  }

  if (missingRoleDefining.length >= 1) {
    cap = Math.min(cap, 6);
    rulesFired.push("one_role_defining_hard_gate_cap_6");
  }

  if (hasFlexibilityOnAnyMissing && cap < 10) {
    const relaxed = Math.min(cap + 1, 6);
    if (relaxed > cap) {
      cap = relaxed;
      rulesFired.push("jd_flexibility_cap_relax_plus_1_max_6");
    }
  }

  const specialist = specialistCapFromRows(missing);
  if (specialist && specialist.cap < cap) {
    cap = specialist.cap;
    rulesFired.push(specialist.ruleId);
  }

  if (missing.length === 0 && rulesFired.length === 0) {
    rulesFired.push("no_hard_gate_miss");
  }

  return { maxTechnicalFit: cap, rulesFired };
}

function computeRecommendations(
  missing: readonly HardGateRequirementRow[],
  maxTechnicalFit: number
): {
  allowedRecommendations: RecommendationLabel[];
  blockedRecommendations: Array<"strong_pursue" | "pursue">;
  rulesFired: string[];
} {
  const rulesFired: string[] = [];
  const all: RecommendationLabel[] = [
    "strong_pursue",
    "pursue",
    "maybe_validate",
    "weak_fit",
    "skip",
  ];

  if (missing.length === 0) {
    return {
      allowedRecommendations: [...all],
      blockedRecommendations: [],
      rulesFired: ["recommendations_all_allowed"],
    };
  }

  const missingPractical = missing.filter((row) =>
    PRACTICAL_GATE_CATEGORIES.has(row.category)
  );
  const missingPrimaryStack = missing.filter(
    (row) => row.category === "primary_stack"
  );
  const hasFlexibility = missing.some((row) => row.jdSuggestsFlexibility);

  let blocked: Array<"strong_pursue" | "pursue"> = [];

  if (missing.length >= 2) {
    blocked = ["strong_pursue", "pursue"];
    rulesFired.push("block_pursue_two_or_more_missing_gates");
  } else if (missing.length === 1) {
    blocked = ["strong_pursue"];
    if (maxTechnicalFit <= 5) {
      blocked = ["strong_pursue", "pursue"];
      rulesFired.push("block_pursue_single_gate_cap_lte_5");
    } else {
      rulesFired.push("block_strong_pursue_single_gate");
    }
  }

  if (missingPractical.length >= 1 && missingPrimaryStack.length >= 1) {
    rulesFired.push("block_pursue_practical_and_primary_stack");
    if (!hasFlexibility) {
      rulesFired.push("practical_and_stack_no_flexibility");
      return {
        allowedRecommendations: ["weak_fit", "skip"],
        blockedRecommendations: blocked,
        rulesFired,
      };
    }
    rulesFired.push("practical_and_stack_flexibility_maybe_validate_only");
    return {
      allowedRecommendations: ["maybe_validate", "weak_fit", "skip"],
      blockedRecommendations: blocked,
      rulesFired,
    };
  }

  const allowed = all.filter(
    (label) => !blocked.includes(label as "strong_pursue" | "pursue")
  );

  return {
    allowedRecommendations: allowed,
    blockedRecommendations: blocked,
    rulesFired,
  };
}

export function computeHardGateAssessment(
  rows: readonly HardGateRequirementRow[],
  evaluatorRecommendedFit: number | null = null
): HardGateAssessment {
  const missing = missingMustHaveHardGates(rows);
  const { maxTechnicalFit, rulesFired: capRules } =
    computeMaxTechnicalFit(missing);
  const {
    allowedRecommendations,
    blockedRecommendations,
    rulesFired: recRules,
  } = computeRecommendations(missing, maxTechnicalFit);

  const evaluatorCeiling =
    evaluatorRecommendedFit === null ? 10 : evaluatorRecommendedFit;
  const effectiveMaxTechnicalFit = Math.min(evaluatorCeiling, maxTechnicalFit);

  const missingHardGateCount = missing.length;
  const missingPracticalGateCount = missing.filter((row) =>
    PRACTICAL_GATE_CATEGORIES.has(row.category)
  ).length;
  const missingPrimaryStackGateCount = missing.filter(
    (row) => row.category === "primary_stack"
  ).length;

  const hasHardGateMiss = missing.length > 0;
  const shouldOpenVerdictWithCaution =
    hasHardGateMiss && effectiveMaxTechnicalFit <= 6;

  return {
    missingHardGateCount,
    missingPracticalGateCount,
    missingPrimaryStackGateCount,
    maxTechnicalFit,
    evaluatorRecommendedFit,
    effectiveMaxTechnicalFit,
    allowedRecommendations,
    blockedRecommendations,
    reasons: [...missing],
    rulesFired: [...capRules, ...recRules],
    hasHardGateMiss,
    shouldOpenVerdictWithCaution,
  };
}
