import { expect, test } from "@playwright/test";

const enterRoom = async (page: import("@playwright/test").Page) => {
  const enterButton = page.getByRole("button", { name: /ENTER ROOM/i }).first();
  await expect(enterButton).toBeVisible();
  await enterButton.click();
  await expect(enterButton).toBeHidden();
};

test("home renders core UI and version report link", async ({ page }) => {
  await page.goto("./");

  await expect(page.getByRole("heading", { name: /Glass Room/i })).toBeVisible();
  await enterRoom(page);

  const versionLink = page.locator('a[title*="Open test report for"]').first();
  await versionLink.scrollIntoViewIfNeeded();
  await expect(versionLink).toBeVisible();
  await expect(versionLink).toHaveAttribute("href", /reports\/executive_test_report\.html/);
});

test("clicking v1.5.0 opens executive report", async ({ context, page }) => {
  await page.goto("./");
  await enterRoom(page);

  const versionLink = page.locator('a[title*="Open test report for"]').first();
  await versionLink.scrollIntoViewIfNeeded();
  const [reportPage] = await Promise.all([context.waitForEvent("page"), versionLink.click({ force: true })]);

  await reportPage.waitForLoadState("domcontentloaded");
  await expect(reportPage).toHaveURL(/reports\/executive_test_report\.html/);
  await expect(reportPage.getByText(/Glassroom Quality Dashboard/i)).toBeVisible();
  await expect(reportPage.getByText(/Version ID:/i)).toBeVisible();
});

test("main control groups are visible after entering room", async ({ page }) => {
  await page.goto("./");
  await enterRoom(page);

  await expect(page.getByText("Physics", { exact: true })).toBeVisible();
  await expect(page.getByText("Creative", { exact: true })).toBeVisible();
  await expect(page.getByText("Destructive", { exact: true })).toBeVisible();
  await expect(page.getByText(/MASTER CONTROL/i)).toBeVisible();
});

test("music panel can be opened, changed and closed", async ({ page }) => {
  await page.goto("./");
  await enterRoom(page);

  const musicButton = page.getByRole("button", { name: /music/i });
  await musicButton.click();

  await expect(page.getByText(/Avoid Leading Tone/i)).toBeVisible();
  const noThirdFilter = page.getByLabel(/No 3rd Filter/i);
  await noThirdFilter.check();
  await expect(noThirdFilter).toBeChecked();

  await page.mouse.click(8, 8);
  await expect(page.getByText(/Avoid Leading Tone/i)).toBeHidden();
});

test("data section synth toggle switches ON and OFF", async ({ page }) => {
  await page.goto("./");
  await enterRoom(page);

  const synthOn = page.getByRole("button", { name: /SYNTH ON/i });
  await expect(synthOn).toBeVisible();
  await synthOn.click();
  await expect(page.getByRole("button", { name: /SYNTH OFF/i })).toBeVisible();
});

test("vitest junit artifact is reachable", async ({ page }) => {
  await page.goto("./reports/vitest-results.xml");
  await expect(page.locator("body")).toContainText("testsuites");
});
