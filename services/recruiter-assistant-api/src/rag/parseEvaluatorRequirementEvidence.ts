import {
  type RecruiterNavLocale,
  RECRUITER_EVIDENCE_EVALUATOR_LABELS,
} from "../constants.js";

export type EvaluatorRequirementEvidenceLevel =
  | "direct"
  | "adjacent"
  | "not_evidenced"
  | "contradictory"
  | "unknown";

export type EvaluatorRequirementEvidenceSummary = {
  readonly rowCount: number;
  readonly directCount: number;
  readonly adjacentCount: number;
  readonly notEvidencedCount: number;
  readonly contradictoryCount: number;
  readonly unknownCount: number;
  /** True when two or more classified evidence levels appear in the table. */
  readonly hasMixedEvidenceLevels: boolean;
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMarkdownEmphasis(value: string): string {
  return value.replace(/\*/g, "").trim();
}

function extractRequirementCoverageSection(
  evaluatorMarkdown: string,
  headingTitle: string
): string | null {
  const headingPattern = new RegExp(
    `^#\\s+${escapeRegExp(headingTitle)}\\s*$`,
    "im"
  );
  const headingMatch = headingPattern.exec(evaluatorMarkdown);
  if (!headingMatch) return null;

  const sectionStart = headingMatch.index + headingMatch[0].length;
  const rest = evaluatorMarkdown.slice(sectionStart);
  const nextHeading = rest.search(/^#\s+/m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

function parseTableRowCells(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return null;
  const parts = trimmed.split("|").map((cell) => cell.trim());
  if (parts.length < 3) return null;
  const withoutEdges = parts[0] === "" ? parts.slice(1) : parts;
  const cells =
    withoutEdges[withoutEdges.length - 1] === ""
      ? withoutEdges.slice(0, -1)
      : withoutEdges;
  return cells.length >= 3 ? cells : null;
}

function isSeparatorRow(line: string): boolean {
  return /^\|\s*[-:]+/.test(line.trim());
}

function classifyEvidenceCell(
  cell: string,
  navLocale: RecruiterNavLocale
): EvaluatorRequirementEvidenceLevel {
  const normalized = stripMarkdownEmphasis(cell);
  const labels = RECRUITER_EVIDENCE_EVALUATOR_LABELS[navLocale];
  if (normalized === labels.termDirectTable) return "direct";
  if (normalized === labels.termAdjacentTable) return "adjacent";
  if (normalized === labels.termNotEvidencedTable) return "not_evidenced";
  if (normalized === labels.termContradictoryTable) return "contradictory";
  if (/^direct$/i.test(normalized)) return "direct";
  if (/^adjacent$/i.test(normalized)) return "adjacent";
  if (/^not\s+evidenced$/i.test(normalized)) return "not_evidenced";
  if (/^contradictory$/i.test(normalized)) return "contradictory";
  return "unknown";
}

/**
 * Parses evidence-level counts from the evaluator requirement coverage table.
 * Returns null when the section or table cannot be read reliably.
 */
export function parseEvaluatorRequirementEvidence(
  evaluatorMarkdown: string,
  navLocale: RecruiterNavLocale
): EvaluatorRequirementEvidenceSummary | null {
  const labels = RECRUITER_EVIDENCE_EVALUATOR_LABELS[navLocale];
  const section = extractRequirementCoverageSection(
    evaluatorMarkdown,
    labels.headingRequirementCoverage
  );
  if (!section) return null;

  const lines = section.split("\n");
  let headerFound = false;
  let evidenceColumnIndex: number | null = null;

  const counts = {
    direct: 0,
    adjacent: 0,
    not_evidenced: 0,
    contradictory: 0,
    unknown: 0,
  };

  for (const line of lines) {
    if (isSeparatorRow(line)) {
      headerFound = true;
      continue;
    }

    const cells = parseTableRowCells(line);
    if (!cells) continue;

    if (!headerFound) {
      const evidenceHeader = stripMarkdownEmphasis(
        labels.tableColEvidenceLevel
      );
      const index = cells.findIndex(
        (cell) => stripMarkdownEmphasis(cell) === evidenceHeader
      );
      if (index >= 0) {
        evidenceColumnIndex = index;
      }
      continue;
    }

    if (evidenceColumnIndex === null) {
      evidenceColumnIndex = 2;
    }

    const evidenceCell = cells[evidenceColumnIndex];
    if (!evidenceCell) continue;

    const level = classifyEvidenceCell(evidenceCell, navLocale);
    if (level === "direct") counts.direct += 1;
    else if (level === "adjacent") counts.adjacent += 1;
    else if (level === "not_evidenced") counts.not_evidenced += 1;
    else if (level === "contradictory") counts.contradictory += 1;
    else counts.unknown += 1;
  }

  const rowCount =
    counts.direct +
    counts.adjacent +
    counts.not_evidenced +
    counts.contradictory +
    counts.unknown;

  if (rowCount < 2) return null;

  const classifiedLevels = [
    counts.direct > 0,
    counts.adjacent > 0,
    counts.not_evidenced > 0,
    counts.contradictory > 0,
  ].filter(Boolean).length;

  return {
    rowCount,
    directCount: counts.direct,
    adjacentCount: counts.adjacent,
    notEvidencedCount: counts.not_evidenced,
    contradictoryCount: counts.contradictory,
    unknownCount: counts.unknown,
    hasMixedEvidenceLevels: classifiedLevels >= 2,
  };
}
