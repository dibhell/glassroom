import { expect, test, type Page, type TestInfo, type Locator } from "@playwright/test";

const captureStep = async (
  page: Page,
  testInfo: TestInfo,
  name: string,
  highlightSelector?: string | Locator
) => {
  let elementHandle: Locator | null = null;
  if (highlightSelector) {
    const locator = typeof highlightSelector === "string" ? page.locator(highlightSelector) : highlightSelector;
    try {
      await locator.scrollIntoViewIfNeeded();
      await locator.evaluate((el) => {
        el.dataset.originalOutline = el.style.outline;
        el.dataset.originalOutlineOffset = el.style.outlineOffset;
        el.style.outline = "4px solid #ff0055";
        el.style.outlineOffset = "2px";
      });
      elementHandle = locator;
    } catch (e) {
      console.warn("Could not highlight element:", e);
    }
  }

  const fileName = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  const path = testInfo.outputPath(fileName);
  await page.screenshot({ path, animations: "disabled", fullPage: true });
  await testInfo.attach(name, { path, contentType: "image/png" });

  if (elementHandle) {
    try {
      await elementHandle.evaluate((el) => {
        el.style.outline = el.dataset.originalOutline || "";
        el.style.outlineOffset = el.dataset.originalOutlineOffset || "";
        delete el.dataset.originalOutline;
        delete el.dataset.originalOutlineOffset;
      });
    } catch (e) {
      console.warn("Could not remove highlight:", e);
    }
  }
};

const enterRoom = async (page: Page, testInfo: TestInfo, prefix = "room") => {
  const enterButton = page.getByRole("button", { name: /ENTER ROOM/i }).first();
  await captureStep(page, testInfo, `${prefix} landing`, enterButton);
  await expect(enterButton).toBeVisible();
  await enterButton.click();
  const masterControl = page.getByText(/MASTER CONTROL/i);
  await expect(masterControl).toBeVisible({ timeout: 15_000 });
  await captureStep(page, testInfo, `${prefix} master control`, masterControl);
};

test("home renders core UI and version report link", async ({ page }, testInfo) => {
  await page.goto("/");
  const heading = page.getByRole("heading", { name: /Glass Room/i });
  await captureStep(page, testInfo, "home hero", heading);
  await expect(heading).toBeVisible();
  await enterRoom(page, testInfo, "home");

  const versionLink = page.locator('a[title*="Open test report for"]').first();
  await versionLink.scrollIntoViewIfNeeded();
  await expect(versionLink).toBeVisible();
  await expect(versionLink).toHaveAttribute("href", /reports\/executive_test_report\.html/);
  await captureStep(page, testInfo, "home version link", versionLink);
});

test("clicking v1.5.0 opens executive report", async ({ context, page }, testInfo) => {
  await page.goto("/");
  await enterRoom(page, testInfo, "report launch");

  const versionLink = page.locator('a[title*="Open test report for"]').first();
  await versionLink.scrollIntoViewIfNeeded();
  await captureStep(page, testInfo, "report launch link", versionLink);
  const [reportPage] = await Promise.all([context.waitForEvent("page"), versionLink.click({ force: true })]);

  await reportPage.waitForLoadState("domcontentloaded");
  await expect(reportPage).toHaveURL(/reports\/executive_test_report\.html/);
  const dashboardTitle = reportPage.getByText(/Glassroom Quality Dashboard/i);
  await expect(dashboardTitle).toBeVisible();
  await expect(reportPage.getByText(/Version ID:/i)).toBeVisible();
  await captureStep(reportPage, testInfo, "report dashboard", dashboardTitle);
});

test("main control groups are visible after entering room", async ({ page }, testInfo) => {
  await page.goto("/");
  await enterRoom(page, testInfo, "control groups");

  const physicsGroup = page.getByText("Physics", { exact: true });
  await expect(physicsGroup).toBeVisible();
  await expect(page.getByText("Creative", { exact: true })).toBeVisible();
  await expect(page.getByText("Destructive", { exact: true })).toBeVisible();
  await expect(page.getByText(/MASTER CONTROL/i)).toBeVisible();
  await captureStep(page, testInfo, "control groups visible", physicsGroup);
});

test("music panel can be opened, changed and closed", async ({ page }, testInfo) => {
  await page.goto("/");
  await enterRoom(page, testInfo, "music panel");

  const musicButton = page.getByRole("button", { name: /music/i });
  await musicButton.click();

  const leadingToneText = page.getByText(/Avoid Leading Tone/i);
  await expect(leadingToneText).toBeVisible();
  await captureStep(page, testInfo, "music panel open", leadingToneText);
  const noThirdFilter = page.getByLabel(/No 3rd Filter/i);
  await noThirdFilter.check();
  await expect(noThirdFilter).toBeChecked();
  await captureStep(page, testInfo, "music panel no-third filter", noThirdFilter);

  await page.mouse.click(8, 8);
  await expect(page.getByText(/Avoid Leading Tone/i)).toBeHidden();
  await captureStep(page, testInfo, "music panel closed");
});

test("data section synth toggle switches ON and OFF", async ({ page }, testInfo) => {
  await page.goto("/");
  await enterRoom(page, testInfo, "synth toggle");

  const synthOn = page.getByRole("button", { name: /SYNTH ON/i });
  await expect(synthOn).toBeVisible();
  await captureStep(page, testInfo, "synth toggle on", synthOn);
  await synthOn.click();
  const synthOff = page.getByRole("button", { name: /SYNTH OFF/i });
  await expect(synthOff).toBeVisible();
  await captureStep(page, testInfo, "synth toggle off", synthOff);
});

test("vitest junit artifact is reachable", async ({ page }, testInfo) => {
  await page.goto("/reports/vitest-results.xml");
  const body = page.locator("body");
  await expect(body).toContainText("testsuites");
  await captureStep(page, testInfo, "vitest junit xml", body);
});

test("pytest junit artifact is reachable", async ({ page }, testInfo) => {
  await page.goto("/reports/pytest-results.xml");
  const body = page.locator("body");
  await expect(body).toContainText(/testsuite|testsuites/i);
  await captureStep(page, testInfo, "pytest junit xml", body);
});
