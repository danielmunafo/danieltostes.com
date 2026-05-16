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

const env = { ...process.env, PLAYWRIGHT_RECRUITER_STACK: "1" };

execSync("npm run build", { cwd: repoRoot, stdio: "inherit", env });
execSync("npx playwright test --project=recruiter-assistant", {
  cwd: repoRoot,
  stdio: "inherit",
  env,
});
