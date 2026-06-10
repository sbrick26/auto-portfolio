import { test, expect, Page } from "@playwright/test";

async function bootDone(page: Page) {
  // boot sequence ends when the quick chips render
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

test("boots into the welcome screen", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await expect(page.getByText("This portfolio runs like a terminal", { exact: false })).toBeVisible();
});

test("runs a command from the keyboard", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await run(page, "projects");
  await expect(page.getByText("autonomous portfolio + agent pipeline")).toBeVisible();
});

test("quick chip taps run commands (mobile-critical path)", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await page.getByRole("button", { name: "skills", exact: true }).first().click();
  await expect(page.getByText("category overview")).toBeVisible();
});

test("unknown commands error gracefully", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await run(page, "sudo make me a sandwich");
  await expect(page.getByText(/command not found: sudo/)).toBeVisible();
});

test("ghost-text autocomplete suggests and accepts", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  const input = page.locator('input[aria-label="terminal input"]:visible');
  await input.pressSequentially("pr");
  await expect(page.getByText("ojects", { exact: true })).toBeVisible();
  await input.press("ArrowRight");
  await expect(input).toHaveValue("projects");
});

test("tabs open, run independently, and close", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await page.getByLabel("new tab").click();
  await run(page, "contact");
  await expect(page.getByText("swayambarik@gmail.com").first()).toBeVisible();
  await expect(page.getByText("welcome", { exact: true })).toBeVisible(); // first tab intact
  await page.getByLabel("close tab").last().click();
  await expect(page.getByText("contact", { exact: true })).toHaveCount(0);
});

test("updates renders the live tail", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await run(page, "updates");
  await expect(page.getByText("tail -f", { exact: false })).toBeVisible();
  await expect(page.getByText("live", { exact: true })).toBeVisible();
});

test("changelog lists the current version", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await run(page, "changelog");
  await expect(page.getByText("current", { exact: true })).toBeVisible();
});

test("secret version command works but is not advertised", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  await run(page, "help");
  await expect(page.getByText("build version")).toHaveCount(0);
  await run(page, "version");
  await expect(page.getByText(/you found the secret command/)).toBeVisible();
});

test("no client names or phone numbers in the served page", async ({ page }) => {
  await page.goto("/");
  await bootDone(page);
  const html = await page.content();
  for (const leak of ["Niagara", "PACCAR", "Knight Swift", "US Xpress", "469-719", "(469)", "utexas.edu"]) {
    expect(html, `"${leak}" must never ship`).not.toContain(leak);
  }
});
