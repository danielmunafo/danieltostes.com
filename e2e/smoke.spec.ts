import { test, expect } from "@playwright/test";
import { DEFAULT_LOCALE } from "@/i18n/request";

const defaultLocalePath = `/${DEFAULT_LOCALE}`;

test("home page loads and shows welcome", async ({ page }) => {
  await page.goto(defaultLocalePath);
  await expect(page.locator("h1")).toContainText("Welcome");
});

test("locale switcher switches language without full navigation", async ({
  page,
}) => {
  await page.goto(defaultLocalePath);
  await expect(page.locator("h1")).toContainText("Welcome");
  await page.getByRole("button", { name: "PT" }).click();
  await expect(page.locator("h1")).toContainText("Bem-vindo");
});
