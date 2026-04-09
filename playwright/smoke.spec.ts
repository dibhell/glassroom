import { expect, test, type Page, type TestInfo } from "@playwright/test";

const captureStep = async (page: Page, testInfo: TestInfo, name: string) => {
  const fileName = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  const path = testInfo.outputPath(fileName);
  await page.screenshot({ path, animations: "disabled", fullPage: true });
  await testInfo.attach(name, { path, contentType: "image/png" });
};

const enterRoom = async (page: Page, testInfo: TestInfo, prefix = "room") => {
  await captureStep(page, testInfo, `${prefix} landing`);
  const enterButton = page.getByRole("button", { name: /ENTER ROOM/i }).first();
  await expect(enterButton).toBeVisible();
  await enterButton.click();
  await expect(page.getByText(/MASTER CONTROL/i)).toBeVisible({ timeout: 15_000 });
  await captureStep(page, testInfo, `${prefix} master control`);
};

test("home renders core UI and version report link", async ({ page }, testInfo) => {
  await page.goto("/");
  await captureStep(page, testInfo, "home hero");
  await expect(page.getByRole("heading", { name: /Glass Room/i })).toBeVisible();
  await enterRoom(page, testInfo, "home");

  const versionLink = page.locator('a[title*="Open test report for"]').first();
  await versionLink.scrollIntoViewIfNeeded();
  await expect(versionLink).toBeVisible();
  await expect(versionLink).toHaveAttribute("href", /reports\/executive_test_report\.html/);
  await captureStep(page, testInfo, "home version link");
});

test("clicking v1.5.0 opens executive report", async ({ context, page }, testInfo) => {
  await page.goto("/");
  await enterRoom(page, testInfo, "report launch");

  const versionLink = page.locator('a[title*="Open test report for"]').first();
  await versionLink.scrollIntoViewIfNeeded();
  await captureStep(page, testInfo, "report launch link");
  const [reportPage] = await Promise.all([context.waitForEvent("page"), versionLink.click({ force: true })]);

  await reportPage.waitForLoadState("domcontentloaded");
  await expect(reportPage).toHaveURL(/reports\/executive_test_report\.html/);
  await expect(reportPage.getByText(/Glassroom Quality Dashboard/i)).toBeVisible();
  await expect(reportPage.getByText(/Version ID:/i)).toBeVisible();
  await captureStep(reportPage, testInfo, "report dashboard");
});

test("main control groups are visible after entering room", async ({ page }, testInfo) => {
  await page.goto("/");
  await enterRoom(page, testInfo, "control groups");

  await expect(page.getByText("Physics", { exact: true })).toBeVisible();
  await expect(page.getByText("Creative", { exact: true })).toBeVisible();
  await expect(page.getByText("Destructive", { exact: true })).toBeVisible();
  await expect(page.getByText(/MASTER CONTROL/i)).toBeVisible();
  await captureStep(page, testInfo, "control groups visible");
});

test("music panel can be opened, changed and closed", async ({ page }, testInfo) => {
  await page.goto("/");
  await enterRoom(page, testInfo, "music panel");

  const musicButton = page.getByRole("button", { name: /music/i });
  await musicButton.click();

  await expect(page.getByText(/Avoid Leading Tone/i)).toBeVisible();
  await captureStep(page, testInfo, "music panel open");
  const noThirdFilter = page.getByLabel(/No 3rd Filter/i);
  await noThirdFilter.check();
  await expect(noThirdFilter).toBeChecked();
  await captureStep(page, testInfo, "music panel no-third filter");

  await page.mouse.click(8, 8);
  await expect(page.getByText(/Avoid Leading Tone/i)).toBeHidden();
  await captureStep(page, testInfo, "music panel closed");
});

test("data section synth toggle switches ON and OFF", async ({ page }, testInfo) => {
  await page.goto("/");
  await enterRoom(page, testInfo, "synth toggle");

  const synthOn = page.getByRole("button", { name: /SYNTH ON/i });
  await expect(synthOn).toBeVisible();
  await captureStep(page, testInfo, "synth toggle on");
  await synthOn.click();
  await expect(page.getByRole("button", { name: /SYNTH OFF/i })).toBeVisible();
  await captureStep(page, testInfo, "synth toggle off");
});

test("vitest junit artifact is reachable", async ({ page }, testInfo) => {
  await page.goto("/reports/vitest-results.xml");
  await expect(page.locator("body")).toContainText("testsuites");
  await captureStep(page, testInfo, "vitest junit xml");
});

test("pytest junit artifact is reachable", async ({ page }, testInfo) => {
  await page.goto("/reports/pytest-results.xml");
  await expect(page.locator("body")).toContainText(/testsuite|testsuites/i);
  await captureStep(page, testInfo, "pytest junit xml");
});
