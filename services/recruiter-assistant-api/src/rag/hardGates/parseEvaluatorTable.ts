import {
  type RecruiterNavLocale,
  RECRUITER_EVIDENCE_EVALUATOR_LABELS,
} from "../../constants.js";
import {
  BACKEND_HARD_GATE_CATEGORIES,
  type EvidenceLevel,
  type HardGateCategory,
  type HardGateRequirementRow,
  type RequirementImportance,
} from "./schema.js";

const CATEGORY_KEYWORDS: ReadonlyArray<{
  category: HardGateCategory;
  patterns: readonly RegExp[];
}> = [
  {
    category: "spoken_language",
    patterns: [
      /\bgerman\b/i,
      /\bfluent\b/i,
      /\blanguage\b/i,
      /\benglish\b/i,
      /\bspanish\b/i,
      /\bportuguese\b/i,
      /\bitalian\b/i,
      /\bfrench\b/i,
    ],
  },
  {
    category: "work_authorization",
    patterns: [
      /\bvisa\b/i,
      /\bwork authorization\b/i,
      /\bright to work\b/i,
      /\bwork permit\b/i,
      /\beu citizen\b/i,
    ],
  },
  {
    category: "location",
    patterns: [/\blocation\b/i, /\brelocate\b/i, /\bberlin\b/i, /\bvienna\b/i],
  },
  {
    category: "timezone",
    patterns: [/\btimezone\b/i, /\btime zone\b/i, /\bcet\b/i, /\best\b/i],
  },
  {
    category: "hybrid_onsite",
    patterns: [
      /\bhybrid\b/i,
      /\bonsite\b/i,
      /\bon-site\b/i,
      /\boffice\b/i,
      /\bremote\b/i,
    ],
  },
  {
    category: "travel",
    patterns: [/\btravel\b/i],
  },
  {
    category: "employment_type",
    patterns: [
      /\bfreelance\b/i,
      /\bcontractor\b/i,
      /\bfull[- ]time\b/i,
      /\bemployee only\b/i,
    ],
  },
  {
    category: "primary_stack",
    patterns: [
      /\bgolang\b/i,
      /\bgo\b/i,
      /\btypescript\b/i,
      /\bjava\b/i,
      /\bpython\b/i,
      /\bphp\b/i,
      /\brust\b/i,
      /\bkotlin\b/i,
      /\bproduction\b/i,
    ],
  },
  {
    category: "specialist_domain",
    patterns: [
      /\bml model validation\b/i,
      /\bshap\b/i,
      /\blime\b/i,
      /\bai governance\b/i,
      /\beu ai act\b/i,
      /\bdata science\b/i,
      /\bpeople management\b/i,
    ],
  },
];

function classifyCategory(requirementText: string): HardGateCategory {
  for (const { category, patterns } of CATEGORY_KEYWORDS) {
    if (patterns.some((re) => re.test(requirementText))) {
      return category;
    }
  }
  return "specialist_domain";
}

function mapEvidenceLevel(
  cell: string,
  labels: (typeof RECRUITER_EVIDENCE_EVALUATOR_LABELS)[RecruiterNavLocale]
): EvidenceLevel {
  const normalized = cell.trim().toLowerCase();
  if (normalized === labels.termDirectTable.toLowerCase()) return "direct";
  if (normalized === labels.termAdjacentTable.toLowerCase()) return "adjacent";
  if (normalized === labels.termContradictoryTable.toLowerCase()) {
    return "contradictory";
  }
  return "not_evidenced";
}

function mapImportance(
  cell: string,
  labels: (typeof RECRUITER_EVIDENCE_EVALUATOR_LABELS)[RecruiterNavLocale]
): RequirementImportance {
  const normalized = cell.trim().toLowerCase();
  if (normalized === labels.termNiceToHaveTable.toLowerCase()) {
    return "nice_to_have";
  }
  return "must_have";
}

function isHardGateRow(
  importance: RequirementImportance,
  category: HardGateCategory,
  evidenceLevel: EvidenceLevel
): boolean {
  if (importance !== "must_have") return false;
  if (evidenceLevel === "direct") return false;
  return BACKEND_HARD_GATE_CATEGORIES.has(category);
}

function inferSeverity(
  category: HardGateCategory,
  evidenceLevel: EvidenceLevel
): "major" | "moderate" | "minor" {
  if (evidenceLevel === "direct") return "minor";
  if (category === "primary_stack" || category === "spoken_language") {
    return "major";
  }
  return "moderate";
}

/**
 * Parses the evaluator requirement coverage table as a fallback when structured extraction fails.
 */
export function parseEvaluatorTable(
  evaluationMarkdown: string,
  navLocale: RecruiterNavLocale
): HardGateRequirementRow[] {
  const labels = RECRUITER_EVIDENCE_EVALUATOR_LABELS[navLocale];
  const heading = `# ${labels.headingRequirementCoverage}`;
  const headingIndex = evaluationMarkdown.indexOf(heading);
  if (headingIndex < 0) return [];

  const afterHeading = evaluationMarkdown.slice(headingIndex + heading.length);
  const lines = afterHeading.split("\n");
  const rows: HardGateRequirementRow[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    if (trimmed.includes("---")) continue;
    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 4) continue;
    const [requirement, importanceCell, evidenceCell, notes] = cells;
    if (requirement === labels.tableColRequirement) continue;

    const requirementImportance = mapImportance(importanceCell, labels);
    const evidenceLevel = mapEvidenceLevel(evidenceCell, labels);
    const category = classifyCategory(requirement);
    const isHardGate = isHardGateRow(
      requirementImportance,
      category,
      evidenceLevel
    );

    rows.push({
      requirement,
      category,
      evidenceLevel,
      requirementImportance,
      isHardGate,
      severity: inferSeverity(category, evidenceLevel),
      jdSuggestsFlexibility: /\b(preferred|ideally|nice to have|plus)\b/i.test(
        `${requirement} ${notes}`
      ),
      rationale: notes || "Parsed from evaluator table",
      sourceRequirementText: requirement,
    });
  }

  return rows.filter((row) => row.isHardGate);
}
