import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { build } from "esbuild";

export const GREEN = "\x1b[32m";
export const RED = "\x1b[31m";
export const YELLOW = "\x1b[33m";
export const DIM = "\x1b[90m";
export const RESET = "\x1b[0m";

export const SEVERITY_COLOR = {
  CRITICAL: RED,
  HIGH: YELLOW,
  MEDIUM: "\x1b[34m",
  LOW: DIM,
};

export function getCliOption(args, name, fallback = null) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  return args[index + 1] ?? fallback;
}

export function hasCliFlag(args, name) {
  return args.includes(name);
}

export function readJsonFile(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function filterCases(cases, filterCase) {
  if (!filterCase) return cases;
  return cases.filter((evalCase) => evalCase.test_id === filterCase);
}

export function printNoCasesAndExit(filterCase) {
  console.error(`No cases matched filter: ${filterCase}`);
  process.exit(1);
}

export function createTotals() {
  return { pass: 0, fail: 0, error: 0, critical: 0 };
}

export function recordCaseResult(totals, evalCase, status) {
  if (status === "pass") {
    totals.pass++;
    return;
  }

  if (status === "error") {
    totals.error++;
  } else {
    totals.fail++;
  }

  if (evalCase.severity_if_failed === "CRITICAL") {
    totals.critical++;
  }
}

export function printCaseScore({ evalCase, failures, error = null, summary }) {
  const passed = failures.length === 0 && error === null;
  const status = passed
    ? `${GREEN}PASS${RESET}`
    : error
      ? `${RED}ERROR${RESET}`
      : `${RED}FAIL${RESET}`;
  const sev = SEVERITY_COLOR[evalCase.severity_if_failed] ?? "";
  const sevLabel = passed
    ? ""
    : ` ${sev}[${evalCase.severity_if_failed}]${RESET}`;
  const title =
    evalCase.query ?? evalCase.claim ?? evalCase.scenario ?? evalCase.test_id;

  console.log(`  ${status}${sevLabel} ${evalCase.test_id} — ${title}`);
  if (summary) {
    console.log(`         ${DIM}${summary}${RESET}`);
  }

  if (error) {
    console.log(`         ${error}`);
  }

  for (const failure of failures) {
    console.log(`         ${failure}`);
  }
}

export function printTotals(prefix, totals) {
  const errorStr = totals.error > 0 ? `, ${totals.error} errored` : "";
  const critStr =
    totals.critical > 0 ? ` (${RED}${totals.critical} CRITICAL${RESET})` : "";

  console.log(
    `\n[${prefix}] Scorecard: ${totals.pass} passed, ${totals.fail} failed${critStr}${errorStr}\n`
  );

  if (totals.fail > 0 || totals.error > 0) {
    process.exit(1);
  }
}

export function includesAll(actual, expected) {
  return expected.every((item) => actual.includes(item));
}

export function sameMembers(actual, expected) {
  if (actual.length !== expected.length) return false;
  return includesAll(actual, expected) && includesAll(expected, actual);
}

export function textContainsAll(text, expected) {
  const lower = text.toLowerCase();
  return expected.every((term) => lower.includes(String(term).toLowerCase()));
}

export function textContainsAny(text, expected) {
  const lower = text.toLowerCase();
  return expected.some((term) => lower.includes(String(term).toLowerCase()));
}

export async function importBundledServiceModule({
  serviceRoot,
  entryPoint,
  name,
}) {
  const absoluteEntry = isAbsolute(entryPoint)
    ? entryPoint
    : join(serviceRoot, entryPoint);

  if (!existsSync(absoluteEntry)) {
    throw new Error(`Service module not found: ${absoluteEntry}`);
  }

  const result = await build({
    entryPoints: [absoluteEntry],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    outfile: `${name}.js`,
    write: false,
    loader: {
      ".md": "text",
    },
    logLevel: "silent",
  });

  const output =
    result.outputFiles.find((file) => /\.m?js$/u.test(file.path)) ??
    result.outputFiles[0];
  if (!output) {
    throw new Error(`Bundled service module produced no JS output: ${name}`);
  }

  const hash = createHash("sha1")
    .update(absoluteEntry)
    .update(output.text)
    .digest("hex")
    .slice(0, 12);
  const encoded = Buffer.from(output.text, "utf8").toString("base64");
  return import(`data:text/javascript;base64,${encoded}#${hash}`);
}
