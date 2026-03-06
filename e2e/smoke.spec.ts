import { test, expect } from "@playwright/test";
import { DEFAULT_LOCALE } from "@/i18n/request";

const defaultLocalePath = `/${DEFAULT_LOCALE}`;

test("home page loads and shows the Summary section", async ({ page }) => {
  await page.goto(defaultLocalePath);
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
});

test("all four sections are rendered", async ({ page }) => {
  await page.goto(defaultLocalePath);
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Experience" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Education & Courses" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "About Me" })).toBeVisible();
});

test("top bar is present with author name and language control", async ({
  page,
}) => {
  await page.goto(defaultLocalePath);
  await expect(page.locator("header").getByText("Daniel Tostes")).toBeVisible();
  await expect(page.getByRole("button", { name: "English" })).toBeVisible();
});

test("language can be changed via locale dropdown", async ({ page }) => {
  await page.goto(defaultLocalePath);
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  await page.getByRole("button", { name: "English" }).click();
  await page.getByRole("menuitem", { name: "Português" }).click();
  await expect(page.getByRole("heading", { name: "Resumo" })).toBeVisible();
});

test("footer displays legal text", async ({ page }) => {
  await page.goto(defaultLocalePath);
  await expect(
    page.getByText(/Daniel Tostes.*2026.*All rights reserved/)
  ).toBeVisible();
});

test("experience section shows company names", async ({ page }) => {
  await page.goto(defaultLocalePath);
  await expect(page.getByText("Personal Fitness Platform")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Klarna" })).toBeVisible();
});

test("search navigates to matched item on select", async ({ page }) => {
  await page.goto(defaultLocalePath);
  const searchInput = page.getByLabel("Search site content");
  await searchInput.click();
  await searchInput.fill("Klarna");
  await expect(
    page.getByRole("listbox").getByRole("option").first()
  ).toBeVisible();
  await page
    .getByRole("option", { name: /Klarna/ })
    .first()
    .click();
  const target = page.locator("#section-experience-item-3");
  await expect(target).toBeInViewport();
});
