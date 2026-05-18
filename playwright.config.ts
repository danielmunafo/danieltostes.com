import { defineConfig, devices } from "@playwright/test";
import {
  getRecruiterTestEnv,
  RECRUITER_E2E_TEST_TIMEOUT_MS,
} from "./e2e/recruiter-test-env";

const TEST_DIR = "./e2e";
const REPORTER = "html";
const TRACE_ON_FIRST_RETRY = "on-first-retry";
const DEVICE_DESKTOP_CHROME = "Desktop Chrome";
const PROJECT_SMOKE = "smoke";
const PROJECT_RECRUITER_ASSISTANT = "recruiter-assistant";
const recruiterTestEnv = getRecruiterTestEnv();
const isCi = !!process.env.CI;
const isRecruiterStackEnabled = process.env.PLAYWRIGHT_RECRUITER_STACK === "1";

const RECRUITER_API_WEBSERVER_ENV_KEYS = [
  "OPENAI_API_KEY",
  "LLAMAINDEX_INDEX_JSON_PATH",
] as const;

function recruiterApiWebServerEnv(): Record<string, string> {
  const env: Record<string, string> = {
    PORT: String(recruiterTestEnv.apiPort),
    ALLOWED_ORIGIN: recruiterTestEnv.siteOrigin,
    RECRUITER_E2E: "1",
    RECAPTCHA_SECRET_KEY: "",
  };
  for (const key of RECRUITER_API_WEBSERVER_ENV_KEYS) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  return env;
}

export default defineConfig({
  testDir: TEST_DIR,
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  reporter: REPORTER,
  use: {
    baseURL: recruiterTestEnv.playwrightBaseUrl,
    trace: TRACE_ON_FIRST_RETRY,
  },
  projects: [
    {
      name: PROJECT_SMOKE,
      testMatch: "**/smoke.spec.ts",
      use: { ...devices[DEVICE_DESKTOP_CHROME] },
    },
    {
      name: PROJECT_RECRUITER_ASSISTANT,
      testMatch: "**/recruiter-assistant*.spec.ts",
      timeout: RECRUITER_E2E_TEST_TIMEOUT_MS,
      retries: isCi ? 1 : 0,
      fullyParallel: false,
      use: { ...devices[DEVICE_DESKTOP_CHROME] },
    },
  ],
  webServer: isRecruiterStackEnabled
    ? [
        {
          // One-shot bundle + server (not watch): avoids reusing a manual `npm run dev`
          // on :3001 with .env.local reCAPTCHA or a broken esbuild watch session.
          command:
            "node scripts/ensure-rag-artifacts.mjs && npm run build && npm run dev:server",
          cwd: "services/recruiter-assistant-api",
          url: recruiterTestEnv.recruiterApiHealthUrl,
          // Local: reuse manual `npm run dev` on :3001 when healthy. CI always starts fresh.
          reuseExistingServer: !isCi,
          timeout: 180_000,
          env: recruiterApiWebServerEnv(),
        },
        {
          command: `npx serve out -p ${recruiterTestEnv.sitePort}`,
          url: recruiterTestEnv.playwrightBaseUrl,
          // Must serve this build's `out/` (not `next dev` on the same port).
          reuseExistingServer: false,
          timeout: 60_000,
        },
      ]
    : undefined,
});
