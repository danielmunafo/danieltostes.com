#!/usr/bin/env node
/**
 * Build static site with NEXT_PUBLIC_* from `.env.test`, then run recruiter Playwright.
 * Usage: node --env-file=.env.test scripts/e2e-recruiter-stack.mjs
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envTestPath = resolve(repoRoot, ".env.test");

if (existsSync(envTestPath)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envTestPath);
  } else {
    for (const line of readFileSync(envTestPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (key) process.env[key] = value;
    }
  }
} else {
  console.warn(
    "e2e-recruiter-stack: .env.test not found; using process env defaults."
  );
}

/** E2E must not bake `.env.local` reCAPTCHA keys into the static export or API. */
const env = {
  ...process.env,
  PLAYWRIGHT_RECRUITER_STACK: "1",
  RECRUITER_E2E: "1",
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "",
  RECAPTCHA_SECRET_KEY: "",
};

const apiPort = process.env.RECRUITER_API_PORT ?? "3001";
const sitePort = process.env.PLAYWRIGHT_SITE_PORT ?? "3000";
const apiHealthUrl =
  process.env.RECRUITER_API_HEALTH_URL ?? `http://127.0.0.1:${apiPort}/health`;

async function probeHealth(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

const apiAlreadyUp = await probeHealth(apiHealthUrl);
if (apiAlreadyUp) {
  console.warn(
    `e2e-recruiter-stack: reusing API on :${apiPort} (Playwright will not start a second server). ` +
      "If Send fails or chat stalls, stop manual `npm run dev` and re-run, or start the API with " +
      "RECAPTCHA_SECRET_KEY= and ALLOWED_ORIGIN=http://localhost:3000."
  );
} else {
  console.warn(
    `e2e-recruiter-stack: ensure port :${sitePort} is free for \`serve out\` (stop \`next dev\` if needed).`
  );
}

execSync("npm run build", { cwd: repoRoot, stdio: "inherit", env });
execSync("node scripts/verify-recruiter-e2e-no-captcha.mjs --static-export", {
  cwd: repoRoot,
  stdio: "inherit",
  env,
});
execSync("npx playwright test --project=recruiter-assistant", {
  cwd: repoRoot,
  stdio: "inherit",
  env,
});
