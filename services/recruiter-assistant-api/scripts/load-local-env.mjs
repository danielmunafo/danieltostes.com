import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Parses KEY=value lines (optional single-quoted or double-quoted value).
 * Does not support multiline values.
 */
function parseDotEnvLines(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!key || /\s/.test(key)) continue;
    let val = line.slice(eq + 1).trim();
    const isDouble = val.startsWith('"') && val.endsWith('"');
    const isSingle = val.startsWith("'") && val.endsWith("'");
    if (isDouble || isSingle) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/** Repo-root `.env.test` keys applied to the API process when `RECRUITER_E2E=1`. */
const REPO_ENV_TEST_TO_API = [
  ["ALLOWED_ORIGIN", "ALLOWED_ORIGIN"],
  ["RECAPTCHA_SECRET_KEY", "RECAPTCHA_SECRET_KEY"],
  ["RECRUITER_API_PORT", "PORT"],
];

function applyRepoEnvTestForE2e(serviceRoot) {
  if (process.env.RECRUITER_E2E !== "1") return;

  const repoEnvTest = join(serviceRoot, "..", "..", ".env.test");
  if (!existsSync(repoEnvTest)) return;

  let text = readFileSync(repoEnvTest, "utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const parsed = parseDotEnvLines(text);
  for (const [from, to] of REPO_ENV_TEST_TO_API) {
    if (parsed[from] !== undefined) {
      process.env[to] = parsed[from];
    }
  }
}

/**
 * Loads `services/recruiter-assistant-api/.env` then `.env.local` into `process.env`.
 * When `RECRUITER_E2E=1`, also applies repo-root `.env.test` (see `.env.test.example`)
 * and skips `RECAPTCHA_SECRET_KEY` from `.env.local`.
 */
export function loadServiceEnvFiles() {
  const scriptsDir = dirname(fileURLToPath(import.meta.url));
  const serviceRoot = join(scriptsDir, "..");

  for (const { name, override } of [{ name: ".env", override: false }]) {
    const absPath = join(serviceRoot, name);
    if (!existsSync(absPath)) continue;
    let text = readFileSync(absPath, "utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const parsed = parseDotEnvLines(text);
    for (const [key, val] of Object.entries(parsed)) {
      if (override || process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }

  applyRepoEnvTestForE2e(serviceRoot);

  for (const { name, override } of [{ name: ".env.local", override: true }]) {
    const absPath = join(serviceRoot, name);
    if (!existsSync(absPath)) continue;
    let text = readFileSync(absPath, "utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const parsed = parseDotEnvLines(text);
    const isRecruiterE2e = process.env.RECRUITER_E2E === "1";
    for (const [key, val] of Object.entries(parsed)) {
      if (isRecruiterE2e && override && key === "RECAPTCHA_SECRET_KEY") {
        continue;
      }
      if (override || process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }

  enforceRecruiterE2eNoCaptcha();
}

/** E2E must never verify captcha, even if `.env.local` sets a secret. */
function enforceRecruiterE2eNoCaptcha() {
  if (process.env.RECRUITER_E2E !== "1") return;
  process.env.RECAPTCHA_SECRET_KEY = "";
}
