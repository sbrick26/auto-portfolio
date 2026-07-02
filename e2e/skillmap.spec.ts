import { test, expect, Page } from "@playwright/test";

// Functional contract for the skill-map homepage, on desktop AND mobile
// (Pixel 7 project). Canvas-leaf interactions that the mobile bottom sheet
// would cover are driven through the panel rows instead, which work on both.

async function mapReady(page: Page) {
  await expect(page.getByRole("button", { name: "Skills", exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

test("loads the map with the card and all eight branches", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  for (const label of [
    "About",
    "Skills",
    "Resume",
    "Updates",
    "Changelog",
    "Projects",
    "Pipeline",
    "Contact",
  ]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Swayam Barik" })).toBeVisible();
});

test("skills tile fans out leaves and folds back on a second tap", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await expect(page.getByRole("button", { name: "AI & Agents", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await expect(page.getByRole("button", { name: "AI & Agents", exact: true })).toBeHidden();
});

test("center card opens the profile panel", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Swayam Barik" }).click();
  await expect(page.getByRole("link", { name: /GitHub/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /LinkedIn/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Email/ })).toBeVisible();
});

test("resume panel keeps the PDF download and copy actions", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  const pdf = page.getByRole("link", { name: /download the resume as a PDF/i });
  await expect(pdf).toBeVisible();
  await expect(pdf).toHaveAttribute("href", "/Swayam_Barik_Resume.pdf");
  await expect(pdf).toHaveAttribute("download", "Swayam_Barik_Resume.pdf");
  await expect(page.getByRole("button", { name: /copy resume as plain text/i })).toBeVisible();
});

test("changelog is panel-only: version rows, no canvas leaves", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Changelog", exact: true }).click();
  await expect(page.locator(".sm-rowlist .sm-row-label").first()).toContainText(/^v\d+\./);
  await expect(page.locator(".sm-leaf")).toHaveCount(0);
});

test("updates panel streams the live feed", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Updates", exact: true }).click();
  expect(await page.locator(".sm-feed-when").count()).toBeGreaterThan(5);
});

test("pipeline panel walks the run with its latest version", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Pipeline", exact: true }).click();
  await expect(page.getByText(/latest v\d+\./)).toBeVisible();
  expect(await page.locator(".sm-flowlist .sm-row").count()).toBeGreaterThanOrEqual(8);
});

test("project row expands and cross-jumps to the skill it proves", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  // drive via the PANEL row (works under the mobile bottom sheet too)
  await page.locator(".sm-row-btn", { hasText: "Agent Pipeline" }).first().click();
  await expect(page.getByText("skills used")).toBeVisible();
  await page.locator(".sm-chip-jump").first().click();
  await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();
});

test("skill group fans a second-layer web with project proof", async ({ page }) => {
  // canvas leaves idle-drift a few px per frame; freeze motion so Playwright's
  // stability check can click them (visual.spec.ts does the same)
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.getByRole("button", { name: "Core Stack", exact: true }).click();
  // the sub-skill lands on the canvas; tapping it surfaces its proof
  await page.getByRole("button", { name: "Python", exact: true }).first().click();
  await expect(page.getByText("proven in").first()).toBeVisible();
});

test("center card plays the demo in an in-site lightbox, cut by device", async ({
  page,
  isMobile,
}) => {
  // don't stream the real footage from S3 in CI; the contract is the modal
  // and which cut it loads, not playback
  await page.route("**/imsway-demo-assets.s3.**", (r) => r.abort());
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Swayam Barik" }).click();
  await page.getByRole("button", { name: /Watch the demo/ }).click();

  const modal = page.locator(".sm-vmodal");
  await expect(modal).toBeVisible();
  await expect(modal.locator("video")).toHaveAttribute(
    "src",
    isMobile ? /swaygent-demo-vertical\.mp4$/ : /swaygent-demo-horizontal\.mp4$/,
  );
  await expect(modal.getByRole("button", { name: /play full screen/i })).toBeVisible();

  // close returns to the map without ever leaving the page
  await modal.getByRole("button", { name: /close video/i }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByRole("button", { name: /Watch the demo/ })).toBeVisible();
});

test("changelog folds history behind show-all", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Changelog", exact: true }).click();
  const before = await page.locator(".sm-rowlist .sm-row").count();
  const showAll = page.getByRole("button", { name: /show all \d+ versions/ });
  if (await showAll.isVisible()) {
    await showAll.click();
    expect(await page.locator(".sm-rowlist .sm-row").count()).toBeGreaterThan(before);
  }
});

test("recenter clears the selection and closes the panel", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("link", { name: /download the resume as a PDF/i })).toBeVisible();
  await page.getByRole("button", { name: /recenter/i }).click();
  await expect(page.getByRole("link", { name: /download the resume as a PDF/i })).toBeHidden();
});
