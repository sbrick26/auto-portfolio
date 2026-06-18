import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

// The resume MUST fit on ONE printed page. This renders the real save-as-PDF
// output (the .resume-doc print view, exactly what a recruiter saves) to a
// Letter PDF and fails if it spills onto a second page. This is the
// deterministic gate the owner asked for: a resume change cannot ship until it
// is verified to be one page. Runs once, on Chromium desktop (page.pdf is
// Chromium-only); it is part of the CI e2e suite, so it gates every PR.
test.describe("resume one-page guarantee", () => {
  test("save-as-PDF output is exactly one Letter page", async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== "chromium", "page.pdf is Chromium-only");
    test.skip(testInfo.project.name !== "desktop", "run once, on desktop");

    // Stub window.print so the printable doc mounts and STAYS mounted (no dialog,
    // no afterprint -> no unmount), letting us capture it.
    await page.addInitScript(() => {
      window.print = () => {};
    });

    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "skills", exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const input = page.locator('input[aria-label="terminal input"]:visible');
    await input.fill("resume");
    await input.press("Enter");

    await page
      .getByRole("button", { name: "print or save the resume as a PDF" })
      .first()
      .click();
    await expect(page.locator(".resume-doc")).toBeAttached({ timeout: 5_000 });

    // page.pdf forces print media; the print stylesheet shows only .resume-doc.
    const buf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
    });

    const pageCount = (await PDFDocument.load(buf)).getPageCount();
    expect(
      pageCount,
      `the resume rendered to ${pageCount} page(s); it must be exactly 1 (tighten bullets or cut lower-weighted content)`,
    ).toBe(1);
  });
});
