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

/**
 * Loads `services/recruiter-assistant-api/.env` then `.env.local` into `process.env`.
 * `.env` only fills missing keys; `.env.local` overrides (Next-style local secrets).
 */
export function loadServiceEnvFiles() {
  const scriptsDir = dirname(fileURLToPath(import.meta.url));
  const serviceRoot = join(scriptsDir, "..");

  for (const { name, override } of [
    { name: ".env", override: false },
    { name: ".env.local", override: true },
  ]) {
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
}
