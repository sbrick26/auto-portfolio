import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { writeFileSync } from "node:fs";

// GENERATOR (not a CI gate): renders the resume print view to a fixed-geometry,
// one-page Letter PDF and writes it to public/Swayam_Barik_Resume.pdf, which the
// "save as PDF" button downloads directly. This makes the downloaded file
// byte-for-byte the SAME in every browser, independent of the user's print
// dialog (margins / headers-footers) - the source of the two-page discrepancy.
// Run on demand: GEN_PDF=1 npx playwright test gen-resume-pdf --project=desktop
// then commit the regenerated PDF. Skipped in normal CI runs.
test.describe("generate resume PDF", () => {
  test("write public/Swayam_Barik_Resume.pdf (fixed one-page geometry)", async ({ page, browserName }, testInfo) => {
    test.skip(!process.env.GEN_PDF, "generator - run with GEN_PDF=1");
    test.skip(browserName !== "chromium", "page.pdf is Chromium-only");
    test.skip(testInfo.project.name !== "desktop", "run once, on desktop");

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
    // .resume-doc is always mounted (display:none on screen) - no click needed.
    await expect(page.locator(".resume-doc")).toBeAttached({ timeout: 5_000 });
    await page.evaluate(async () => {
      await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
    });

    // LOCKED geometry: Letter, 0.5in margins, no headers/footers, backgrounds on.
    const buf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
    });

    const pageCount = (await PDFDocument.load(buf)).getPageCount();
    expect(pageCount, `generated PDF is ${pageCount} pages; must be 1`).toBe(1);

    writeFileSync("public/Swayam_Barik_Resume.pdf", buf);
    console.log(`GENERATED public/Swayam_Barik_Resume.pdf (${buf.length} bytes, ${pageCount} page)`);
  });
});
