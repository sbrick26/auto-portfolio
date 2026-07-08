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

// The pipeline panel renders LiveShipped, which fetches the repo's latest merge
// from GitHub's public API and labels it "last shipped Xh ago" off the wall
// clock. Both are non-deterministic (network + time), so the raw panel can never
// have a stable baseline. We freeze the clock and stub the endpoint with one
// fixed commit dated a fixed offset before it, so the live block renders
// identical bytes every run - the snapshot still covers the real component, it
// just no longer drifts with the calendar or the latest push.
const PIPELINE_NOW = "2026-06-30T12:00:00.000Z";
const PIPELINE_FEED = [
  {
    sha: "7baa5d0f1e2d3c4b5a6978800000000000000000",
    html_url: "https://github.com/sbrick26/auto-portfolio/commit/7baa5d0",
    commit: {
      message: "Live pipeline proof: real recent merges from GitHub (#72)",
      committer: { date: "2026-06-30T09:00:00.000Z" }, // 3h before PIPELINE_NOW
    },
  },
];

async function stubPipelineFeed(page: Page) {
  await page.clock.setFixedTime(new Date(PIPELINE_NOW));
  await page.route("**/api.github.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PIPELINE_FEED),
    }),
  );
}

// The panel's ".sm-run" card shows the newest changelog entry (version, date,
// idea) straight from content/data.ts. That text changes with EVERY release, and
// its length decides whether the idea wraps to one, two, or three lines - which
// changes the card's height and reflows every pipeline row below it. Pixel-
// snapshotting it would break on the next ship no matter what (this is exactly
// how the QA "fix regressions visual" loop kept regenerating this one baseline).
// So for the snapshot we pin the card to a fixed height (rows below stay put) via
// a TEST-ONLY style - the shipped panel is untouched - and mask the card's own
// pixels so the release-specific words never drive the diff. The card frame,
// LiveShipped strip, and the full pipeline flow below stay fully asserted.
const RUN_CARD = ".sm-run";
async function pinRunCard(page: Page) {
  await page.addStyleTag({
    content: `${RUN_CARD} .sm-row-blurb{height:36px;overflow:hidden;` +
      `display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}`,
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
  await stubPipelineFeed(page);
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Pipeline", exact: true }).click();
  // reduced motion keeps the walker static (all rows lit)
  await page.waitForTimeout(800);
  await pinRunCard(page);
  await expect(page).toHaveScreenshot("map-pipeline.png", {
    mask: [page.locator(RUN_CARD)],
  });
});

test("profile panel looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Swayam Barik" }).click();
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-me.png");
});
