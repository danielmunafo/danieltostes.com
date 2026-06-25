#!/usr/bin/env node
/**
 * Deterministic hard-gate eval runner. It executes the committed HG cases by
 * feeding their expected rows into the same clamp/recommendation rules used by
 * the service, then prints a stable scorecard and exits nonzero on failures.
 *
 * Usage:
 *   node scripts/eval-hard-gates.mjs
 *   node scripts/eval-hard-gates.mjs --case HG-04
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createTotals,
  filterCases,
  getCliOption,
  importBundledServiceModule,
  includesAll,
  printCaseScore,
  printNoCasesAndExit,
  printTotals,
  readJsonFile,
  recordCaseResult,
  sameMembers,
} from "./lib/eval-runner-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceRoot = join(__dirname, "..");
const repoRoot = join(serviceRoot, "../..");
const casesPath = join(repoRoot, "evals/hard-gates/cases.json");
const args = process.argv.slice(2);
const filterCase = getCliOption(args, "--case");

function cleanQuery(evalCase) {
  return evalCase.query.replace(/^JD:\s*/i, "").trim();
}

function specialistRequirementFromRules(evalCase) {
  const rule = (evalCase.expected_rules_fired_contains ?? []).find((item) =>
    /^specialist_.+_cap_\d+$/u.test(item)
  );
  if (!rule) return null;
  const match = rule.match(/^specialist_(.+)_cap_\d+$/u);
  return match ? match[1].replace(/_/g, " ") : null;
}

function inferRequirement(evalCase, row) {
  if (row.requirement) return row.requirement;
  if (row.category === "specialist_domain") {
    return specialistRequirementFromRules(evalCase) ?? cleanQuery(evalCase);
  }

  const query = cleanQuery(evalCase);
  const lower = query.toLowerCase();
  if (row.category === "primary_stack") {
    if (/\bgolang\b|\bgo\b/u.test(lower)) return "Production Golang";
    if (/\bjava\b|\bspring\b/u.test(lower)) return "Java/Spring";
    if (/\bnode\.?js\b|\btypescript\b/u.test(lower)) {
      return "Node.js/TypeScript";
    }
  }
  if (row.category === "spoken_language") {
    if (/\bgerman\b/u.test(lower)) return "German fluency";
    if (/\benglish\b/u.test(lower)) return "English fluency";
  }
  if (row.category === "work_authorization") return "Work authorization";
  if (row.category === "hybrid_onsite") return "Hybrid/on-site presence";
  if (row.category === "location") return "Location requirement";
  if (row.category === "timezone") return "Timezone requirement";
  if (row.category === "employment_type") return "Employment type";
  if (row.category === "travel") return "Travel requirement";
  return query;
}

function inferSeverity(category, evidenceLevel) {
  if (evidenceLevel === "direct") return "minor";
  if (category === "primary_stack" || category === "spoken_language") {
    return "major";
  }
  return "moderate";
}

function buildRow(evalCase, expectedRow) {
  const evidenceLevel = expectedRow.evidenceLevel ?? "not_evidenced";
  const category = expectedRow.category;
  return {
    requirement: inferRequirement(evalCase, expectedRow),
    category,
    evidenceLevel,
    requirementImportance: expectedRow.requirementImportance ?? "must_have",
    isHardGate: expectedRow.isHardGate ?? true,
    severity: expectedRow.severity ?? inferSeverity(category, evidenceLevel),
    jdSuggestsFlexibility: expectedRow.jdSuggestsFlexibility ?? false,
    rationale:
      expectedRow.rationale ??
      evalCase.expected_outcome ??
      "Derived from committed hard-gate eval case.",
    sourceRequirementText: cleanQuery(evalCase),
  };
}

function rowsForCase(evalCase) {
  const rows = [];
  for (const expectedRow of evalCase.expected_gate_rows ?? []) {
    rows.push(buildRow(evalCase, expectedRow));
  }
  if (evalCase.expected_golang_row) {
    rows.push(buildRow(evalCase, evalCase.expected_golang_row));
  }
  if (evalCase.expected_java_row) {
    rows.push(buildRow(evalCase, evalCase.expected_java_row));
  }
  return rows;
}

function rowMatches(row, expectedRow) {
  return Object.entries(expectedRow).every(
    ([key, value]) => row[key] === value
  );
}

function assertExpectedRows(rows, evalCase, failures) {
  const expectedRows = [
    ...(evalCase.expected_gate_rows ?? []),
    ...(evalCase.expected_golang_row ? [evalCase.expected_golang_row] : []),
    ...(evalCase.expected_java_row ? [evalCase.expected_java_row] : []),
  ];

  for (const expectedRow of expectedRows) {
    if (!rows.some((row) => rowMatches(row, expectedRow))) {
      failures.push(`missing row matching ${JSON.stringify(expectedRow)}`);
    }
  }
}

function assertAssessment(assessment, evalCase) {
  const failures = [];

  if (evalCase.expected_missing_hard_gate_count !== undefined) {
    const actual = assessment.missingHardGateCount;
    const expected = evalCase.expected_missing_hard_gate_count;
    if (actual !== expected) {
      failures.push(`missingHardGateCount ${actual} !== ${expected}`);
    }
  }

  if (evalCase.expected_max_technical_fit !== undefined) {
    const actual = assessment.effectiveMaxTechnicalFit;
    const expected = evalCase.expected_max_technical_fit;
    if (actual !== expected) {
      failures.push(`effectiveMaxTechnicalFit ${actual} !== ${expected}`);
    }
  }

  if (evalCase.expected_max_technical_fit_lte !== undefined) {
    const actual = assessment.effectiveMaxTechnicalFit;
    const expected = evalCase.expected_max_technical_fit_lte;
    if (actual > expected) {
      failures.push(`effectiveMaxTechnicalFit ${actual} > ${expected}`);
    }
  }

  if (evalCase.expected_max_technical_fit_gte !== undefined) {
    const actual = assessment.effectiveMaxTechnicalFit;
    const expected = evalCase.expected_max_technical_fit_gte;
    if (actual < expected) {
      failures.push(`effectiveMaxTechnicalFit ${actual} < ${expected}`);
    }
  }

  if (evalCase.blocked_recommendations) {
    const expected = evalCase.blocked_recommendations;
    const actual = assessment.blockedRecommendations;
    if (expected.length === 0 && actual.length > 0) {
      failures.push(`blockedRecommendations expected [], got [${actual}]`);
    } else if (!includesAll(actual, expected)) {
      failures.push(`blockedRecommendations [${actual}] missing [${expected}]`);
    }
  }

  if (evalCase.allowed_recommendations) {
    const expected = evalCase.allowed_recommendations;
    const actual = assessment.allowedRecommendations;
    if (!sameMembers(actual, expected)) {
      failures.push(`allowedRecommendations [${actual}] !== [${expected}]`);
    }
  }

  if (evalCase.allowed_recommendations_subset) {
    const expected = evalCase.allowed_recommendations_subset;
    const actual = assessment.allowedRecommendations;
    const outside = actual.filter((item) => !expected.includes(item));
    if (outside.length > 0) {
      failures.push(
        `allowedRecommendations [${actual}] not subset of [${expected}]`
      );
    }
  }

  if (evalCase.allowed_recommendations_includes) {
    const expected = evalCase.allowed_recommendations_includes;
    const actual = assessment.allowedRecommendations;
    if (!includesAll(actual, expected)) {
      failures.push(`allowedRecommendations [${actual}] missing [${expected}]`);
    }
  }

  if (evalCase.expected_rules_fired_contains) {
    const expected = evalCase.expected_rules_fired_contains;
    const actual = assessment.rulesFired;
    if (!includesAll(actual, expected)) {
      failures.push(`rulesFired [${actual}] missing [${expected}]`);
    }
  }

  return failures;
}

async function main() {
  const { cases } = readJsonFile(casesPath);
  const toRun = filterCases(cases, filterCase);
  if (toRun.length === 0) printNoCasesAndExit(filterCase);

  const { computeHardGateAssessment } = await importBundledServiceModule({
    serviceRoot,
    entryPoint: "src/rag/hardGates/computeHardGateAssessment.ts",
    name: "hard-gate-compute",
  });

  console.log(
    `\n[eval:hard-gates] Running ${toRun.length} deterministic case(s)\n`
  );

  const totals = createTotals();
  for (const evalCase of toRun) {
    const rows = rowsForCase(evalCase);
    const rowFailures = [];
    assertExpectedRows(rows, evalCase, rowFailures);

    const assessment = computeHardGateAssessment(rows, null);
    const failures = [
      ...rowFailures,
      ...assertAssessment(assessment, evalCase),
    ];
    const summary =
      `cap=${assessment.effectiveMaxTechnicalFit}; ` +
      `missing=${assessment.missingHardGateCount}; ` +
      `blocked=[${assessment.blockedRecommendations.join(", ")}]; ` +
      `rules=[${assessment.rulesFired.join(", ")}]`;

    printCaseScore({ evalCase, failures, summary });
    recordCaseResult(totals, evalCase, failures.length === 0 ? "pass" : "fail");
  }

  printTotals("eval:hard-gates", totals);
}

main().catch((err) => {
  console.error("[eval:hard-gates] Fatal:", err);
  process.exit(1);
});
