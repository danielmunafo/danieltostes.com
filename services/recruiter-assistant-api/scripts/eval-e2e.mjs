#!/usr/bin/env node
/**
 * E2E eval runner. Sends each JD fixture to the running dev server and checks
 * deterministic assertions on the full pipeline output (recommendation label,
 * technical fit score, presence of references/gaps sections).
 * Rubric assertions that require human judgment are printed but not auto-graded.
 *
 * Requires:
 *   Dev server running at EVAL_SERVER_URL (default: http://127.0.0.1:3001)
 *   Start it with: RECRUITER_E2E=1 npm run dev:server  (in services/recruiter-assistant-api)
 *   RECAPTCHA_SECRET_KEY must NOT be set, or RECRUITER_E2E=1 must be set on the server.
 *
 * Usage:
 *   node scripts/eval-e2e.mjs
 *   node scripts/eval-e2e.mjs --case E2E-04
 *   node scripts/eval-e2e.mjs --priority
 *   node scripts/eval-e2e.mjs --timeout 120000
 *   node scripts/eval-e2e.mjs --json-out ../../evals/history/e2e-latest.json
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  E2E_PRIORITY_CASE_IDS,
  buildCaseScorecardResult,
  buildEvalScorecard,
  readGitSha,
  selectE2eCases,
  writeEvalScorecard,
} from "./lib/eval-scorecard.mjs";
import {
  formatPromptVersionStamps,
  loadPromptVersionStamps,
} from "./lib/prompt-version-stamps.mjs";
import { loadServiceEnvFiles } from "./load-local-env.mjs";

loadServiceEnvFiles();

const __dirname = dirname(fileURLToPath(import.meta.url));
const serviceRoot = join(__dirname, "..");
const repoRoot = join(serviceRoot, "../..");
const casesPath = join(repoRoot, "evals/e2e/cases.json");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const filterCase = args.includes("--case")
  ? args[args.indexOf("--case") + 1]
  : null;
const priorityOnly = args.includes("--priority");
const timeoutMs = args.includes("--timeout")
  ? parseInt(args[args.indexOf("--timeout") + 1], 10)
  : 90_000;
const jsonOutPath = args.includes("--json-out")
  ? args[args.indexOf("--json-out") + 1]
  : null;

const SERVER_URL =
  process.env.EVAL_SERVER_URL?.trim() ?? "http://127.0.0.1:3001";

// ---------------------------------------------------------------------------
// Stream parsing
// ---------------------------------------------------------------------------

/**
 * Parses the Vercel AI SDK data stream protocol. Text chunks are on lines
 * starting with `0:` followed by a JSON-encoded string.
 */
function parseDataStream(rawBody) {
  const lines = rawBody.split("\n");
  return lines
    .filter((line) => line.startsWith("0:"))
    .map((line) => {
      try {
        return JSON.parse(line.slice(2));
      } catch {
        return "";
      }
    })
    .join("");
}

const THINKING_END = "[[THINKING_END]]";
const CHART_END = "[[CHART_DATA_END]]";
const BRIEFING_END = "[[BRIEFING_PREP_END]]";

/**
 * Extracts the pitch section (recruiter-facing text) from the full streamed response.
 * The pitch follows the last closing marker in the response.
 */
function extractPitch(fullText) {
  const positions = [
    { marker: THINKING_END, end: fullText.lastIndexOf(THINKING_END) },
    { marker: CHART_END, end: fullText.lastIndexOf(CHART_END) },
    { marker: BRIEFING_END, end: fullText.lastIndexOf(BRIEFING_END) },
  ].filter((p) => p.end >= 0);

  if (positions.length === 0) return null;
  const last = positions.sort((a, b) => b.end - a.end)[0];
  return fullText.slice(last.end + last.marker.length).trim() || null;
}

function isOffTopicResponse(fullText) {
  return (
    !fullText.includes("[[THINKING_START]]") &&
    !fullText.includes("[[CHART_DATA_START]]") &&
    fullText.trim().length > 0
  );
}

// ---------------------------------------------------------------------------
// Pitch parsers
// ---------------------------------------------------------------------------

function parseRecommendation(pitchText) {
  const patterns = [
    /\*\*Recommendation:\*\*\s*\*\*([^*\n]+)\*\*/i,
    /\*\*Recommendation:\*\*\s*([^\n]+)/i,
    /\*\*Recomendação:\*\*\s*\*\*([^*\n]+)\*\*/i,
    /\*\*Recomendación:\*\*\s*\*\*([^*\n]+)\*\*/i,
    /\*\*Raccomandazione:\*\*\s*\*\*([^*\n]+)\*\*/i,
  ];
  for (const pattern of patterns) {
    const match = pitchText.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function parseTechnicalFit(pitchText) {
  const match =
    pitchText.match(/Technical fit:\s*(\d{1,2})\s*\/\s*10/i) ??
    pitchText.match(
      /(?:Aderência|Aderencia|Aderenza)\s+técnica:\s*(\d{1,2})\s*\/\s*10/i
    );
  if (!match) return null;
  return parseInt(match[1], 10);
}

function hasReferencesSection(fullText) {
  return /^##\s+References|^##\s+Referências|^##\s+Referencias|^##\s+Riferimenti/im.test(
    fullText
  );
}

function hasGapsSection(fullText) {
  return /^##\s+Not evidenced|^##\s+Não evidenciado|^##\s+No evidenciado/im.test(
    fullText
  );
}

function gapSectionContains(fullText, terms) {
  const gapMatch = fullText.match(
    /## (?:Not evidenced|Não evidenciado|No evidenciado)([\s\S]*?)(?:^##|\z)/im
  );
  if (!gapMatch) return false;
  const gapText = gapMatch[1].toLowerCase();
  return terms.some((term) => gapText.includes(term.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Recommendation label normalisation
// Maps localized recommendation labels to the schema keys used in cases.json
// ---------------------------------------------------------------------------

const RECOMMENDATION_KEY_MAP = {
  // English
  "strong pursue": "strong_pursue",
  pursue: "pursue",
  "maybe validate": "maybe_validate",
  "weak fit": "weak_fit",
  skip: "skip",
  // Portuguese
  "recomendar fortemente": "strong_pursue",
  recomendar: "pursue",
  "validar talvez": "maybe_validate",
  "encaixe fraco": "weak_fit",
  ignorar: "skip",
  // Spanish
  "perseguir fuerte": "strong_pursue",
  perseguir: "pursue",
  "quizás validar": "maybe_validate",
  "encaje débil": "weak_fit",
  omitir: "skip",
  // Italian
  "perseguire fortemente": "strong_pursue",
  perseguire: "pursue",
  "forse validare": "maybe_validate",
  "scarsa compatibilità": "weak_fit",
  salta: "skip",
};

function normalizeRecommendation(label) {
  if (!label) return null;
  const lower = label.toLowerCase().trim();
  return RECOMMENDATION_KEY_MAP[lower] ?? lower.replace(/\s+/g, "_");
}

// ---------------------------------------------------------------------------
// HTTP call
// ---------------------------------------------------------------------------

async function callDevServer(jdText) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${SERVER_URL}/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: jdText }],
        locale: "en",
      }),
      signal: controller.signal,
    });

    if (!res.ok && res.status !== 200) {
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    }

    const rawBody = await res.text();
    return rawBody;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Assertion runner
// ---------------------------------------------------------------------------

function runDeterministicAssertions(assertions, parsedOutput) {
  const failures = [];

  const {
    recommendation_raw,
    recommendation_key,
    technicalFit,
    fullText,
    isOffTopic,
  } = parsedOutput;

  if (assertions.recommendation_in) {
    if (
      !recommendation_key ||
      !assertions.recommendation_in.includes(recommendation_key)
    ) {
      failures.push(
        `recommendation "${recommendation_raw}" (key: ${recommendation_key}) not in [${assertions.recommendation_in.join(", ")}]`
      );
    }
  }

  if (assertions.recommendation_not_in) {
    if (
      recommendation_key &&
      assertions.recommendation_not_in.includes(recommendation_key)
    ) {
      failures.push(
        `recommendation "${recommendation_raw}" (key: ${recommendation_key}) is in blocked list [${assertions.recommendation_not_in.join(", ")}]`
      );
    }
  }

  if (assertions.technical_fit_gte !== undefined) {
    if (technicalFit === null || technicalFit < assertions.technical_fit_gte) {
      failures.push(
        `technical fit ${technicalFit} < required ${assertions.technical_fit_gte}`
      );
    }
  }

  if (assertions.technical_fit_lte !== undefined) {
    if (technicalFit === null || technicalFit > assertions.technical_fit_lte) {
      failures.push(
        `technical fit ${technicalFit} > max allowed ${assertions.technical_fit_lte}`
      );
    }
  }

  if (assertions.references_section_present === true) {
    if (!hasReferencesSection(fullText)) {
      failures.push("references section missing from response");
    }
  }

  if (assertions.references_section_present === false) {
    if (hasReferencesSection(fullText)) {
      failures.push("references section present but expected absent");
    }
  }

  if (assertions.gaps_section_present === true) {
    if (!hasGapsSection(fullText)) {
      failures.push("gaps section missing from response");
    }
  }

  if (assertions.references_gaps_contains_any) {
    if (
      !gapSectionContains(fullText, assertions.references_gaps_contains_any)
    ) {
      failures.push(
        `gaps section missing any of: [${assertions.references_gaps_contains_any.join(", ")}]`
      );
    }
  }

  if (assertions.is_off_topic_response === true) {
    if (!isOffTopic) {
      failures.push(
        "expected off-topic response but got a full pipeline response"
      );
    }
  }

  if (assertions.no_recommendation_label === true) {
    if (recommendation_raw) {
      failures.push(
        `expected no recommendation label but found: "${recommendation_raw}"`
      );
    }
  }

  if (assertions.no_references_section === true) {
    if (hasReferencesSection(fullText)) {
      failures.push("expected no references section but one was present");
    }
  }

  if (assertions.no_technical_fit_score === true) {
    if (technicalFit !== null) {
      failures.push(
        `expected no technical fit score but found: ${technicalFit}/10`
      );
    }
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Reporter
// ---------------------------------------------------------------------------

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[90m";
const RESET = "\x1b[0m";
const SEVERITY_COLOR = {
  CRITICAL: RED,
  HIGH: YELLOW,
  MEDIUM: "\x1b[34m",
  LOW: DIM,
};

function printCaseResult(evalCase, failures, parsedOutput, durationMs) {
  const { test_id, scenario, severity_if_failed, rubric_assertions } = evalCase;
  const sev = SEVERITY_COLOR[severity_if_failed] ?? "";
  const passed = failures.length === 0;
  const status = passed ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
  const sevLabel = passed ? "" : ` ${sev}[${severity_if_failed}]${RESET}`;

  console.log(`\n  ${status}${sevLabel} ${test_id} — ${scenario}`);
  console.log(
    `  ${DIM}Recommendation: ${parsedOutput.recommendation_raw ?? "(none)"} | Technical fit: ${parsedOutput.technicalFit !== null ? `${parsedOutput.technicalFit}/10` : "(none)"} | ${durationMs}ms${RESET}`
  );

  if (!passed) {
    for (const f of failures) {
      console.log(`  ${RED}✗${RESET} ${f}`);
    }
  }

  if (rubric_assertions?.length) {
    console.log(`  ${DIM}Rubric (manual review):${RESET}`);
    for (const r of rubric_assertions) {
      console.log(`  ${DIM}  □ ${r}${RESET}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const runStartedAt = new Date();
  const runStartedMs = Date.now();
  const { cases } = JSON.parse(readFileSync(casesPath, "utf8"));
  const toRun = selectE2eCases(cases, { filterCase, priorityOnly });

  if (toRun.length === 0) {
    const filterDescription = [
      filterCase ? `case=${filterCase}` : null,
      priorityOnly ? "priority=true" : null,
    ]
      .filter(Boolean)
      .join(", ");
    console.error(`No cases matched filter: ${filterDescription}`);
    process.exit(1);
  }

  const selectedCaseIds = toRun.map((evalCase) => evalCase.test_id);
  const caseResults = [];
  const promptVersionStamps = loadPromptVersionStamps(serviceRoot);
  const promptVersionLine = formatPromptVersionStamps(promptVersionStamps);
  const gitSha = readGitSha(repoRoot);

  const buildCurrentScorecard = ({ runStatus = null, runError = null } = {}) =>
    buildEvalScorecard({
      runner: "eval:e2e",
      gitSha,
      timestamp: runStartedAt.toISOString(),
      durationMs: Date.now() - runStartedMs,
      serverUrl: SERVER_URL,
      promptVersionLine,
      promptVersions: promptVersionStamps,
      filters: {
        case: filterCase,
        priority: priorityOnly,
      },
      timeoutMs,
      selectedCaseIds,
      caseResults,
      runStatus,
      runError,
    });

  const writeCurrentScorecard = (scorecard) => {
    if (!jsonOutPath) return null;
    return writeEvalScorecard(jsonOutPath, scorecard);
  };

  console.log(`\n[eval:e2e] Server: ${SERVER_URL}`);
  console.log(`[eval:e2e] Prompt versions: ${promptVersionLine}`);
  if (priorityOnly) {
    console.log(
      `[eval:e2e] Priority subset: ${E2E_PRIORITY_CASE_IDS.join(", ")}`
    );
  }
  console.log(
    `[eval:e2e] Running ${toRun.length} case(s) — timeout ${timeoutMs}ms each\n`
  );

  // Verify server is reachable
  try {
    const healthRes = await fetch(`${SERVER_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!healthRes.ok)
      throw new Error(`Health check returned HTTP ${healthRes.status}`);
    console.log(`[eval:e2e] Server health OK\n`);
  } catch (err) {
    console.error(
      `[eval:e2e] Cannot reach dev server at ${SERVER_URL}\n` +
        `  Start it with: RECRUITER_E2E=1 npm run dev:server\n` +
        `  Error: ${err.message}`
    );
    const scorecard = buildCurrentScorecard({
      runStatus: "error",
      runError: {
        phase: "server_health",
        message: err.message,
      },
    });
    const writtenPath = writeCurrentScorecard(scorecard);
    if (writtenPath) {
      console.error(`[eval:e2e] Scorecard written: ${writtenPath}`);
    }
    process.exit(1);
  }

  for (const evalCase of toRun) {
    const jdPath = join(repoRoot, "evals/e2e", evalCase.jd_file);
    if (!existsSync(jdPath)) {
      const errorMessage = `fixture not found: ${evalCase.jd_file}`;
      console.log(
        `  ${RED}ERROR${RESET} ${evalCase.test_id} — ${errorMessage}`
      );
      caseResults.push(
        buildCaseScorecardResult({
          evalCase,
          status: "error",
          errorMessage,
        })
      );
      continue;
    }

    const jdText = readFileSync(jdPath, "utf8").trim();
    const start = Date.now();
    process.stdout.write(`  Running ${evalCase.test_id}…`);

    let rawBody;
    try {
      rawBody = await callDevServer(jdText);
    } catch (err) {
      const errorMessage = err.message.slice(0, 120);
      process.stdout.write("\r");
      console.log(
        `  ${RED}ERROR${RESET} ${evalCase.test_id} — ${errorMessage}`
      );
      caseResults.push(
        buildCaseScorecardResult({
          evalCase,
          status: "error",
          errorMessage,
        })
      );
      continue;
    }

    const durationMs = Date.now() - start;
    const fullText = parseDataStream(rawBody);
    const isOffTopic = isOffTopicResponse(fullText);
    const pitch = extractPitch(fullText);
    const recommendation_raw = pitch ? parseRecommendation(pitch) : null;
    const recommendation_key = normalizeRecommendation(recommendation_raw);
    const technicalFit = pitch ? parseTechnicalFit(pitch) : null;

    const parsedOutput = {
      fullText,
      pitch,
      isOffTopic,
      recommendation_raw,
      recommendation_key,
      technicalFit,
    };

    const failures = runDeterministicAssertions(
      evalCase.deterministic_assertions ?? {},
      parsedOutput
    );

    process.stdout.write("\r");
    printCaseResult(evalCase, failures, parsedOutput, durationMs);

    caseResults.push(
      buildCaseScorecardResult({
        evalCase,
        status: failures.length === 0 ? "pass" : "fail",
        durationMs,
        deterministicFailures: failures,
        parsedOutput,
      })
    );
  }

  const scorecard = buildCurrentScorecard();
  const writtenPath = writeCurrentScorecard(scorecard);
  const { counts } = scorecard;
  const errorStr = counts.error > 0 ? `, ${counts.error} errored` : "";
  const critStr =
    counts.critical > 0 ? ` (${RED}${counts.critical} CRITICAL${RESET})` : "";
  console.log(
    `\n[eval:e2e] Results: ${counts.pass} passed, ${counts.fail} failed${critStr}${errorStr}`
  );
  console.log(`[eval:e2e] Prompt versions: ${promptVersionLine}\n`);
  if (writtenPath) {
    console.log(`[eval:e2e] Scorecard written: ${writtenPath}\n`);
  }

  if (counts.fail > 0 || counts.error > 0) process.exit(1);
}

main().catch((err) => {
  console.error("[eval:e2e] Fatal:", err);
  process.exit(1);
});
