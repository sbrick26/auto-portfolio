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

// The footer version badge (.sm-ver) renders APP_VERSION, i.e. package.json's
// version. The pipeline runner bumps that version (npm version minor) and
// appends the changelog entry in the "v$V" release commit AFTER this build's
// snapshots are captured, so the badge - and, on the pipeline panel, the
// "latest vX" run card that reads the same changelog - change on every single
// drop. Pixel-asserting them means the baseline is stale the moment it is
// committed, which is exactly what kept re-breaking these snapshots (main only
// ever got re-baselined, never fixed). Mask the live release stamp so the
// snapshots assert the stable layout, not the version of the day.
function liveMasks(page: Page) {
  return [page.locator(".sm-ver")];
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

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("map overview looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.waitForTimeout(600);
  await expect(page).toHaveScreenshot("map-home.png", { mask: liveMasks(page) });
});

test("skills fan looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-skills.png", { mask: liveMasks(page) });
});

test("skill sub-web looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await page.getByRole("button", { name: "Core Stack", exact: true }).click();
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-subweb.png", { mask: liveMasks(page) });
});

test("project detail looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator(".sm-row-btn", { hasText: "Agent Pipeline" }).first().click();
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-project.png", { mask: liveMasks(page) });
});

test("pipeline panel looks right @visual", async ({ page }) => {
  await stubPipelineFeed(page);
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Pipeline", exact: true }).click();
  // The "latest vX" run card (.sm-run) shows the newest changelog headline,
  // clamped but still one to three lines depending on its length. When a drop
  // changes that headline the card's height changes, reflowing every row below
  // it (that height cascade, not any real regression, is the ~8k-pixel diff
  // that kept tripping this snapshot). Pin the blurb to a single line so the
  // card footprint is constant, then mask the card so its live text is ignored
  // - together they make the panel layout below it deterministic.
  await page.addStyleTag({
    content: ".sm-run .sm-row-blurb{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
  });
  // reduced motion keeps the walker static (all rows lit)
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-pipeline.png", {
    mask: [...liveMasks(page), page.locator(".sm-run")],
  });
});

test("profile panel looks right @visual", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Swayam Barik" }).click();
  await page.waitForTimeout(800);
  await expect(page).toHaveScreenshot("map-me.png", { mask: liveMasks(page) });
});
