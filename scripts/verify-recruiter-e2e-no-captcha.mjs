#!/usr/bin/env node
/**
 * Guardrails for recruiter E2E: no reCAPTCHA on the static export or API env.
 * Usage:
 *   node scripts/verify-recruiter-e2e-no-captcha.mjs
 *   node scripts/verify-recruiter-e2e-no-captcha.mjs --static-export
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const shouldCheckStaticExport = args.has("--static-export");

/** Google reCAPTCHA v2 site keys start with `6L` and are ~40 chars. */
const RECAPTCHA_SITE_KEY_IN_BUNDLE = /6L[\w-]{38,}/;

function fail(message) {
  console.error(`verify-recruiter-e2e-no-captcha: ${message}`);
  process.exit(1);
}

function assertBuildEnvHasNoRecaptchaKeys() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? "";
  if (siteKey) {
    fail(
      "NEXT_PUBLIC_RECAPTCHA_SITE_KEY must be empty when building for recruiter E2E."
    );
  }
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim() ?? "";
  if (secret) {
    fail("RECAPTCHA_SECRET_KEY must be empty when building for recruiter E2E.");
  }
}

function walkFiles(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walkFiles(path, acc);
    } else if (/\.(js|html)$/i.test(name)) {
      acc.push(path);
    }
  }
  return acc;
}

function assertStaticExportHasNoRecaptchaSiteKey() {
  const outDir = join(repoRoot, "out");
  let stat;
  try {
    stat = statSync(outDir);
  } catch {
    fail(
      "`out/` not found — run `npm run build` with NEXT_PUBLIC_RECAPTCHA_SITE_KEY= first."
    );
  }
  if (!stat.isDirectory()) {
    fail("`out/` is not a directory.");
  }

  for (const file of walkFiles(outDir)) {
    const text = readFileSync(file, "utf8");
    if (RECAPTCHA_SITE_KEY_IN_BUNDLE.test(text)) {
      fail(`reCAPTCHA site key pattern found in ${file}`);
    }
  }
}

assertBuildEnvHasNoRecaptchaKeys();

if (shouldCheckStaticExport) {
  assertStaticExportHasNoRecaptchaSiteKey();
}

console.log("verify-recruiter-e2e-no-captcha: ok");
