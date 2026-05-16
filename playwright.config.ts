import { defineConfig, devices } from "@playwright/test";
import { getRecruiterTestEnv } from "./e2e/recruiter-test-env";

const TEST_DIR = "./e2e";
const REPORTER = "html";
const TRACE_ON_FIRST_RETRY = "on-first-retry";
const DEVICE_DESKTOP_CHROME = "Desktop Chrome";
const PROJECT_SMOKE = "smoke";
const PROJECT_RECRUITER_ASSISTANT = "recruiter-assistant";
const RECRUITER_E2E_TIMEOUT_MS = 120_000;

const recruiterTestEnv = getRecruiterTestEnv();
const isCi = !!process.env.CI;
const isRecruiterStackEnabled = process.env.PLAYWRIGHT_RECRUITER_STACK === "1";

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
      timeout: RECRUITER_E2E_TIMEOUT_MS,
      retries: isCi ? 1 : 0,
      fullyParallel: false,
      use: { ...devices[DEVICE_DESKTOP_CHROME] },
    },
  ],
  webServer: isRecruiterStackEnabled
    ? [
        {
          command: "npm run dev",
          cwd: "services/recruiter-assistant-api",
          url: recruiterTestEnv.recruiterApiHealthUrl,
          reuseExistingServer: !isCi,
          timeout: 180_000,
          env: {
            PORT: String(recruiterTestEnv.apiPort),
            ALLOWED_ORIGIN: recruiterTestEnv.siteOrigin,
          },
        },
        {
          command: `npx serve out -p ${recruiterTestEnv.sitePort}`,
          url: recruiterTestEnv.playwrightBaseUrl,
          reuseExistingServer: !isCi,
          timeout: 60_000,
        },
      ]
    : undefined,
});
