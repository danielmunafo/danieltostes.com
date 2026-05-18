import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ENV_TEST_FILE = ".env.test";

/**
 * Per-test budget for one full recruiter pipeline (evaluator → chart → pitch).
 * `waitForRecruiterPipelineComplete` uses this as a shared deadline across serial UI waits.
 * CI keeps a long ceiling for real OpenAI latency; local runs fail faster when the API is stuck.
 */
export const RECRUITER_E2E_TEST_TIMEOUT_MS = process.env.CI
  ? 600_000
  : Number(process.env.RECRUITER_E2E_TEST_TIMEOUT_MS ?? 180_000);

let isEnvTestLoaded = false;

/** Loads repo-root `.env.test` once (Node 20.12+ `process.loadEnvFile`). */
export function loadEnvTestFile(): void {
  if (isEnvTestLoaded) return;
  isEnvTestLoaded = true;
  const envTestPath = resolve(process.cwd(), ENV_TEST_FILE);
  if (!existsSync(envTestPath)) return;
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envTestPath);
    return;
  }
  // Node < 20.12: minimal KEY=VALUE parser (no multiline values).
  for (const line of readFileSync(envTestPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export type RecruiterTestEnv = {
  readonly sitePort: number;
  readonly apiPort: number;
  readonly siteOrigin: string;
  readonly playwrightBaseUrl: string;
  readonly recruiterApiBaseUrl: string;
  readonly recruiterApiHealthUrl: string;
};

export function getRecruiterTestEnv(): RecruiterTestEnv {
  loadEnvTestFile();

  const sitePort = Number(process.env.PLAYWRIGHT_SITE_PORT ?? "3000");
  const apiPort = Number(process.env.RECRUITER_API_PORT ?? "3001");
  const siteOrigin =
    process.env.ALLOWED_ORIGIN?.trim() || `http://localhost:${sitePort}`;
  const playwrightBaseUrl =
    process.env.PLAYWRIGHT_BASE_URL?.trim() || siteOrigin;
  const recruiterApiBaseUrl =
    process.env.NEXT_PUBLIC_RECRUITER_API_URL?.trim() ||
    `http://127.0.0.1:${apiPort}`;
  const recruiterApiHealthUrl =
    process.env.RECRUITER_API_HEALTH_URL?.trim() ||
    `${recruiterApiBaseUrl.replace(/\/$/, "")}/health`;

  return {
    sitePort,
    apiPort,
    siteOrigin,
    playwrightBaseUrl,
    recruiterApiBaseUrl,
    recruiterApiHealthUrl,
  };
}
