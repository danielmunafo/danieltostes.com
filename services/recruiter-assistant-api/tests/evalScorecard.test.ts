import { describe, expect, it } from "vitest";
import {
  E2E_PRIORITY_CASE_IDS,
  buildCaseScorecardResult,
  buildEvalScorecard,
  selectE2eCases,
  summarizeCaseScorecards,
} from "../scripts/lib/eval-scorecard.mjs";

const evalCases = [
  evalCase("E2E-01", "Staff Node.js role", "HIGH"),
  evalCase("E2E-02", "Go backend role", "CRITICAL"),
  evalCase("E2E-03", "German onsite role", "CRITICAL"),
  evalCase("E2E-04", "AI engineer role", "CRITICAL"),
  evalCase("E2E-05", "Engineering manager role", "HIGH"),
];

describe("eval scorecard helpers", () => {
  it("selects the documented E2E priority subset", () => {
    const selected = selectE2eCases(evalCases, {
      filterCase: null,
      priorityOnly: true,
    });

    expect(selected.map((evalCase) => evalCase.test_id)).toEqual(
      E2E_PRIORITY_CASE_IDS
    );
  });

  it("allows an explicit case filter within the priority subset", () => {
    const selected = selectE2eCases(evalCases, {
      filterCase: "E2E-04",
      priorityOnly: true,
    });

    expect(selected.map((evalCase) => evalCase.test_id)).toEqual(["E2E-04"]);
  });

  it("summarizes passes, deterministic failures, errors, and critical cases", () => {
    const caseResults = [
      buildCaseScorecardResult({
        evalCase: evalCases[0],
        status: "pass",
        durationMs: 1200,
        parsedOutput: {
          recommendation_raw: "Pursue",
          recommendation_key: "pursue",
          technicalFit: 8,
          isOffTopic: false,
        },
      }),
      buildCaseScorecardResult({
        evalCase: evalCases[1],
        status: "fail",
        durationMs: 2400,
        deterministicFailures: ["technical fit 8 > max allowed 5"],
      }),
      buildCaseScorecardResult({
        evalCase: evalCases[2],
        status: "error",
        errorMessage: "HTTP 500",
      }),
    ];

    expect(summarizeCaseScorecards(caseResults)).toEqual({
      pass: 1,
      fail: 1,
      error: 1,
      critical: 2,
    });
  });

  it("builds a machine-readable scorecard with deterministic failure details", () => {
    const caseResults = [
      buildCaseScorecardResult({
        evalCase: evalCases[1],
        status: "fail",
        durationMs: 2400,
        deterministicFailures: ["technical fit 8 > max allowed 5"],
      }),
    ];

    const scorecard = buildEvalScorecard({
      runner: "eval:e2e",
      gitSha: "abc123",
      timestamp: "2026-06-26T12:00:00.000Z",
      durationMs: 2500,
      serverUrl: "http://127.0.0.1:3001",
      promptVersionLine: "pitch@1.0.0",
      promptVersions: [{ promptId: "pitch", version: "1.0.0", stage: "pitch" }],
      filters: { case: null, priority: true },
      timeoutMs: 90_000,
      selectedCaseIds: ["E2E-02"],
      caseResults,
    });

    expect(scorecard).toMatchObject({
      schemaVersion: 1,
      runner: "eval:e2e",
      runStatus: "fail",
      casesRun: 1,
      counts: {
        pass: 0,
        fail: 1,
        error: 0,
        critical: 1,
      },
      deterministicAssertionFailures: [
        {
          testId: "E2E-02",
          failures: ["technical fit 8 > max allowed 5"],
        },
      ],
    });
  });
});

function evalCase(
  testId: string,
  scenario: string,
  severityIfFailed: "CRITICAL" | "HIGH"
) {
  return {
    test_id: testId,
    scenario,
    severity_if_failed: severityIfFailed,
  };
}
