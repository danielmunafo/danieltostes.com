import { test, expect } from "@playwright/test";
import { DEFAULT_LOCALE } from "@/i18n/request";

const defaultLocalePath = `/${DEFAULT_LOCALE}`;

test("home page loads and shows the Summary section", async ({ page }) => {
  await page.goto(defaultLocalePath);
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
});

test("candidate fit briefing hero is visible", async ({ page }) => {
  await page.goto(defaultLocalePath);
  await expect(
    page.getByRole("heading", { name: /candidate fit briefing/i })
  ).toBeVisible();
});

test("recruiter assistant terms page loads", async ({ page }) => {
  await page.goto(`${defaultLocalePath}/recruiter-assistant/terms`);
  await expect(
    page.getByRole("heading", {
      name: /AI Recruiter Assistant — Terms of use and fair use/i,
    })
  ).toBeVisible();
});

test("recruiter assistant professional-context page loads with section anchors", async ({
  page,
}) => {
  await page.goto(
    `${defaultLocalePath}/recruiter-assistant/professional-context`
  );
  await expect(
    page.getByRole("heading", {
      name: /Professional context — portfolio evidence themes/i,
    })
  ).toBeVisible();
  await expect(
    page.locator("#section-professional-context-item-0")
  ).toBeAttached();
});

test("recruiter assistant professional-context deep link scrolls to section", async ({
  page,
}) => {
  await page.goto(
    `${defaultLocalePath}/recruiter-assistant/professional-context#section-professional-context-item-5`
  );
  const target = page.locator("#section-professional-context-item-5");
  await expect(target).toBeVisible();
  await expect
    .poll(async () => {
      const box = await target.boundingBox();
      return box !== null && box.y < 120;
    })
    .toBe(true);
});

test("summary remains reachable after scrolling past assistant", async ({
  page,
}) => {
  await page.goto(defaultLocalePath);
  await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1200));
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
  await expect(page.getByText("danieltostes.com")).toBeVisible();
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
