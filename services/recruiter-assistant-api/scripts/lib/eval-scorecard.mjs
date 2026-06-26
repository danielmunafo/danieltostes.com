import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const EVAL_SCORECARD_SCHEMA_VERSION = 1;
export const E2E_PRIORITY_CASE_IDS = ["E2E-02", "E2E-03", "E2E-04"];

const STATUS_PASS = "pass";
const STATUS_FAIL = "fail";
const STATUS_ERROR = "error";
const CRITICAL_SEVERITY = "CRITICAL";

export function selectE2eCases(
  cases,
  { filterCase = null, priorityOnly = false }
) {
  let selectedCases = priorityOnly
    ? cases.filter((evalCase) =>
        E2E_PRIORITY_CASE_IDS.includes(evalCase.test_id)
      )
    : cases;

  if (filterCase) {
    selectedCases = selectedCases.filter(
      (evalCase) => evalCase.test_id === filterCase
    );
  }

  return selectedCases;
}

export function buildCaseScorecardResult({
  evalCase,
  status,
  durationMs = null,
  deterministicFailures = [],
  errorMessage = null,
  parsedOutput = null,
}) {
  return {
    testId: evalCase.test_id,
    scenario: evalCase.scenario,
    severity: evalCase.severity_if_failed,
    status,
    durationMs,
    recommendationRaw: parsedOutput?.recommendation_raw ?? null,
    recommendationKey: parsedOutput?.recommendation_key ?? null,
    technicalFit: parsedOutput?.technicalFit ?? null,
    isOffTopic: parsedOutput?.isOffTopic ?? null,
    deterministicFailures,
    errorMessage,
  };
}

export function summarizeCaseScorecards(caseResults) {
  const counts = {
    pass: 0,
    fail: 0,
    error: 0,
    critical: 0,
  };

  for (const result of caseResults) {
    if (result.status === STATUS_PASS) {
      counts.pass++;
      continue;
    }

    if (result.status === STATUS_FAIL) {
      counts.fail++;
    } else if (result.status === STATUS_ERROR) {
      counts.error++;
    }

    if (result.severity === CRITICAL_SEVERITY) {
      counts.critical++;
    }
  }

  return counts;
}

export function buildEvalScorecard({
  runner,
  gitSha,
  timestamp,
  serverUrl,
  promptVersionLine,
  promptVersions,
  filters,
  timeoutMs,
  durationMs,
  selectedCaseIds,
  caseResults,
  runStatus = null,
  runError = null,
}) {
  const counts = summarizeCaseScorecards(caseResults);
  const hasErrors = counts.error > 0 || runError !== null;
  const hasFailures = counts.fail > 0;
  const resolvedRunStatus =
    runStatus ??
    (hasErrors ? STATUS_ERROR : hasFailures ? STATUS_FAIL : STATUS_PASS);

  return {
    schemaVersion: EVAL_SCORECARD_SCHEMA_VERSION,
    runner,
    gitSha,
    timestamp,
    runStatus: resolvedRunStatus,
    durationMs,
    serverUrl,
    promptVersionLine,
    promptVersions,
    filters,
    timeoutMs,
    selectedCaseIds,
    casesRun: caseResults.length,
    counts,
    deterministicAssertionFailures: caseResults
      .filter((result) => result.deterministicFailures.length > 0)
      .map((result) => ({
        testId: result.testId,
        scenario: result.scenario,
        severity: result.severity,
        failures: result.deterministicFailures,
      })),
    errors: caseResults
      .filter((result) => result.errorMessage)
      .map((result) => ({
        testId: result.testId,
        scenario: result.scenario,
        severity: result.severity,
        message: result.errorMessage,
      })),
    runError,
    cases: caseResults,
  };
}

export function writeEvalScorecard(jsonOutPath, scorecard) {
  const outputPath = resolve(jsonOutPath);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(scorecard, null, 2)}\n`, "utf8");
  return outputPath;
}

export function readGitSha(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}
