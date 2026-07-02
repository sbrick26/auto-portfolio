import { test, expect, Page } from "@playwright/test";

// @visual: screenshot baselines live on the pipeline Mac (darwin). CI runs
// the functional suite only (--grep-invert @visual); these run locally and
// in the daily pipeline where the baselines were generated.
//
// Reduced motion is emulated so the idle leaf drift (rAF-driven, which
// toHaveScreenshot's animations:"disabled" cannot freeze), the camera ease,
// the card's color ring, and the pipeline walker are deterministic frame to
// frame.

async function mapReady(page: Page) {
  await expect(page.getByRole("button", { name: "Skills", exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("map overview looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.waitForTimeout(600);
  await expect(page).toHaveScreenshot("map-home.png");
});

test("skills fan looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-skills.png");
});

test("skill sub-web looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.getByRole("button", { name: "Core Stack", exact: true }).click();
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-subweb.png");
});

test("project detail looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator(".sm-row-btn", { hasText: "Agent Pipeline" }).first().click();
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-project.png");
});

test("pipeline panel looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Pipeline", exact: true }).click();
  // reduced motion keeps the walker static (all rows lit)
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-pipeline.png");
});

test("profile panel looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Swayam Barik" }).click();
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-me.png");
});
