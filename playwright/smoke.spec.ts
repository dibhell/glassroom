import { expect, test } from "@playwright/test";

test("home renders core UI and version report link", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Glass Room/i })).toBeVisible();
  const enterButton = page.getByRole("button", { name: /ENTER ROOM/i }).first();
  await expect(enterButton).toBeVisible();
  await enterButton.click();

  const versionLink = page.locator('a[title*="Open test report for"]').first();
  await versionLink.scrollIntoViewIfNeeded();
  await expect(versionLink).toBeVisible();
  await expect(versionLink).toHaveAttribute("href", /reports\/executive_test_report\.html/);
});

test("clicking v1.5.0 opens executive report", async ({ context, page }) => {
  await page.goto("/");

  const enterButton = page.getByRole("button", { name: /ENTER ROOM/i }).first();
  await enterButton.click();

  const versionLink = page.locator('a[title*="Open test report for"]').first();
  await versionLink.scrollIntoViewIfNeeded();
  const [reportPage] = await Promise.all([context.waitForEvent("page"), versionLink.click({ force: true })]);

  await reportPage.waitForLoadState("domcontentloaded");
  await expect(reportPage).toHaveURL(/reports\/executive_test_report\.html/);
  await expect(reportPage.getByText(/Glassroom Quality Dashboard/i)).toBeVisible();
  await expect(reportPage.getByText(/Version ID:/i)).toBeVisible();
});

test("vitest junit artifact is reachable", async ({ page }) => {
  await page.goto("/reports/vitest-results.xml");
  await expect(page.locator("body")).toContainText("testsuites");
});
