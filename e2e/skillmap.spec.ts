import { test, expect, Locator, Page } from "@playwright/test";

// Functional contract for the skill-map homepage, on desktop AND mobile
// (Pixel 7 project). Canvas-leaf interactions that the mobile bottom sheet
// would cover are driven through the panel rows instead, which work on both.

async function mapReady(page: Page) {
  await expect(page.getByRole("button", { name: "Skills", exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

/** is this node actually inside the visible stage, or parked off-screen? */
async function isOnStage(page: Page, node: Locator) {
  const box = await node.boundingBox();
  if (!box) return false;
  const view = page.viewportSize();
  if (!view) return false;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return cx >= 0 && cx <= view.width && cy >= 0 && cy <= view.height;
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

test("pipeline panel walks the run with its latest version", async ({ page, isMobile }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Pipeline", exact: true }).click();
  expect(await page.locator(".sm-flowlist .sm-row").count()).toBeGreaterThanOrEqual(8);
  if (isMobile) {
    // the peek sheet shows the compact stepper (every stage icon at once);
    // the run banner and full list arrive with the expanded sheet
    await expect(page.locator(".sm-flowstep")).toBeVisible();
    await page.locator(".sm-grab").click();
  }
  await expect(page.getByText(/latest v\d+\./)).toBeVisible();
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
  await page.getByRole("button", { name: /See it in action/ }).click();

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
  await expect(page.getByRole("button", { name: /See it in action/ })).toBeVisible();
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

test("a node URL deep-loads straight onto that node", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#projects/sterling-mcp");
  await mapReady(page);

  // the panel opens on the projects branch, led by that project's row
  await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
  await expect(page.locator(".sm-row-on")).toContainText("Sterling MCP");

  // and the node itself is on the canvas, framed inside the stage
  const node = page.getByRole("button", { name: "Sterling MCP", exact: true });
  await expect(node).toBeVisible();
  expect(await isOnStage(page, node)).toBe(true);
});

test("selecting a node addresses it, and back returns to the previous view", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);

  await page.getByRole("button", { name: "Skills", exact: true }).click();
  await expect(page).toHaveURL(/#skills$/);
  await page.locator(".sm-row-btn", { hasText: "Core Stack" }).first().click();
  await expect(page).toHaveURL(/#skills\/core-stack$/);

  // back walks the selections instead of leaving the site
  await page.goBack();
  await expect(page).toHaveURL(/#skills$/);
  await expect(page.getByRole("heading", { name: "Skills" })).toBeVisible();

  await page.goBack();
  await expect(page.locator(".sm-panel-open")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Skills", exact: true })).toBeVisible();
});

test("an unknown hash falls back to the home view", async ({ page }) => {
  await page.goto("/#projects/does-not-exist");
  await mapReady(page);
  await expect(page.locator(".sm-panel-open")).toHaveCount(0);
  await expect(page.locator(".sm-leaf")).toHaveCount(0);
});

test("copy link puts the node's own URL on the clipboard", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "clipboard permissions are chromium-only here");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await mapReady(page);

  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator(".sm-row-btn", { hasText: "Sterling MCP" }).first().click();
  await page.getByRole("button", { name: "copy a link to this node" }).click();

  await expect(page.getByRole("button", { name: "link copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(new URL("/#projects/sterling-mcp", page.url()).toString());
});

test("the map is reachable and framed by keyboard alone", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await mapReady(page);

  // tab in from the top of the page: the first node focused is the card, and
  // the camera keeps whatever has focus inside the stage
  await page.keyboard.press("Tab");
  const card = page.locator(".sm-card");
  await expect(card).toBeFocused();

  // walk the branch ring; every stop stays on screen
  await page.keyboard.press("ArrowDown");
  const branch = page.locator(".sm-branch:focus");
  await expect(branch).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(400);
  expect(await isOnStage(page, page.locator(".sm-branch:focus"))).toBe(true);

  // Enter opens the panel and hands focus to its heading
  const label = await page.locator(".sm-branch:focus").getAttribute("aria-label");
  await page.keyboard.press("Enter");
  await expect(page.locator(".sm-panel-title")).toBeFocused();

  // Escape closes it and returns focus to the node it came from
  await page.keyboard.press("Escape");
  await expect(page.locator(".sm-panel-open")).toHaveCount(0);
  await expect(page.locator(".sm-branch:focus")).toHaveAttribute("aria-label", label!);
});

test("recenter clears the selection and closes the panel", async ({ page }) => {
  await page.goto("/");
  await mapReady(page);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("link", { name: /download the resume as a PDF/i })).toBeVisible();
  await page.getByRole("button", { name: /recenter/i }).click();
  await expect(page.getByRole("link", { name: /download the resume as a PDF/i })).toBeHidden();
});
