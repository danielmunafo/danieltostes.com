import { test, expect } from "@playwright/test";
import { DEFAULT_LOCALE } from "@/i18n/request";

const defaultLocalePath = `/${DEFAULT_LOCALE}`;

test("home page loads and shows welcome", async ({ page }) => {
  await page.goto(defaultLocalePath);
  await expect(page.locator("h1")).toContainText("Welcome");
});

test("top bar is present with author name and language control", async ({
  page,
}) => {
  await page.goto(defaultLocalePath);
  await expect(page.getByText("Daniel Tostes")).toBeVisible();
  await expect(page.getByRole("button", { name: "English" })).toBeVisible();
});

test("language can be changed via locale dropdown", async ({ page }) => {
  await page.goto(defaultLocalePath);
  await expect(page.locator("h1")).toContainText("Welcome");
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("menuitem", { name: "Português" }).click();
  await expect(page.locator("h1")).toContainText("Bem-vindo");
});
