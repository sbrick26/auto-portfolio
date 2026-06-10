import { test, expect, Page } from "@playwright/test";

// @visual: screenshot baselines live on the pipeline Mac (darwin). CI runs
// the functional suite only (--grep-invert @visual); these run locally and
// in the daily pipeline where the baselines were generated.

async function bootDone(page: Page) {
  await expect(page.getByRole("button", { name: "skills", exact: true }).first()).toBeVisible({
    timeout: 15_000,
  });
}

async function run(page: Page, cmd: string) {
  // every mounted session keeps its input; only the active tab's is visible
  const input = page.locator('input[aria-label="terminal input"]:visible');
  await input.fill(cmd);
  await input.press("Enter");
}

test("welcome screen looks right @visual", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await page.waitForTimeout(600); // let reveal animations settle
  await expect(page).toHaveScreenshot("welcome.png");
});

test("projects view looks right @visual", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await run(page, "projects");
  await expect(page.getByText("autonomous portfolio + agent pipeline")).toBeVisible();
  await page.waitForTimeout(900); // card reveal stagger
  await expect(page).toHaveScreenshot("projects.png");
});

test("changelog view looks right @visual", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await run(page, "changelog");
  await expect(page.getByText("current", { exact: true })).toBeVisible();
  await page.waitForTimeout(900);
  await expect(page).toHaveScreenshot("changelog.png");
});
