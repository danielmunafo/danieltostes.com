import { defineConfig, devices } from "@playwright/test";

const TEST_DIR = "./e2e";
const REPORTER = "html";
const TRACE_ON_FIRST_RETRY = "on-first-retry";
const DEVICE_DESKTOP_CHROME = "Desktop Chrome";
const PROJECT_SMOKE = "smoke";
const isCi = !!process.env.CI;

export default defineConfig({
  testDir: TEST_DIR,
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: isCi ? 1 : undefined,
  reporter: REPORTER,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: TRACE_ON_FIRST_RETRY,
  },
  projects: [
    {
      name: PROJECT_SMOKE,
      testMatch: "**/smoke.spec.ts",
      use: { ...devices[DEVICE_DESKTOP_CHROME] },
    },
  ],
});
