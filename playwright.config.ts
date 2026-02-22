import { defineConfig, devices } from "@playwright/test";

const TEST_DIR = "./e2e";
const REPORTER = "html";
const DEFAULT_BASE_URL = "http://localhost:3000";
const TRACE_ON_FIRST_RETRY = "on-first-retry";
const PROJECT_CHROMIUM = "chromium";
const DEVICE_DESKTOP_CHROME = "Desktop Chrome";

export default defineConfig({
  testDir: TEST_DIR,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: REPORTER,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? DEFAULT_BASE_URL,
    trace: TRACE_ON_FIRST_RETRY,
  },
  projects: [
    { name: PROJECT_CHROMIUM, use: { ...devices[DEVICE_DESKTOP_CHROME] } },
  ],
  webServer: undefined,
});
