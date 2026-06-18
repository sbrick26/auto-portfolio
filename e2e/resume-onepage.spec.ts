import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

// The downloadable resume is now a FIXED-geometry PDF (gen-resume-pdf.spec.ts:
// Letter, 0.5in margins, no headers/footers) that the "save as PDF" button
// serves directly - so the real output geometry is known and constant, not the
// user's print dialog. This gate measures the print view at that exact geometry
// (with the real font loaded - a headless fallback font mis-measures) and is
// also the FILL target: the resume should fill toward one page, not sit
// half-empty. gen-resume-pdf is the hard 1-page assertion; this guards the fill
// stays under one page with a small margin.
const PRINT_W = 720; // Letter 8.5in - 2x0.5in margins = 7.5in
const PAGE_USABLE_H = 960; // Letter 11in - 2x0.5in margins = 10in
const SAFE_H = 905; // fill toward here; ~55px under usable so it stays one page

test.describe("resume one-page guarantee", () => {
  test("the resume fits one Letter page (fonts loaded, with margin)", async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== "chromium", "page.pdf is Chromium-only");
    test.skip(testInfo.project.name !== "desktop", "run once, on desktop");

    await page.addInitScript(() => {
      window.print = () => {};
    });
    await page.setViewportSize({ width: PRINT_W, height: 1200 });

    await page.goto("/");
    await expect(
      page.getByRole("button", { name: "skills", exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });

    const input = page.locator('input[aria-label="terminal input"]:visible');
    await input.fill("resume");
    await input.press("Enter");
    // .resume-doc is always mounted (display:none on screen) - no click needed.
    await expect(page.locator(".resume-doc")).toBeAttached({ timeout: 5_000 });

    // Render with the REAL fonts and the print stylesheet, exactly as it prints.
    await page.evaluate(async () => {
      await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
    });
    await page.emulateMedia({ media: "print" });

    const probe = await page.evaluate(() => {
      const el = document.querySelector(".resume-doc") as HTMLElement | null;
      const fontsApi = document as unknown as { fonts: { size: number } };
      return {
        heightPx: el ? Math.ceil(el.getBoundingClientRect().height) : -1,
        loadedFontFaces: fontsApi.fonts.size,
        family: el ? getComputedStyle(el).fontFamily : "",
      };
    });
    const { heightPx, loadedFontFaces, family } = probe;

    // (a) honors @page (clean print). (b) simulates Chrome's INTERACTIVE default
    // (headers/footers ON eat margin space) - the closest match to a real
    // owner save-as-PDF, which is what was still coming out two pages.
    const bufClean = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    const bufRealistic = await page.pdf({
      printBackground: true,
      format: "Letter",
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: '<span style="font-size:9px"></span>',
      margin: { top: "0.5in", bottom: "0.5in", left: "0.5in", right: "0.5in" },
    });
    const pagesClean = (await PDFDocument.load(bufClean)).getPageCount();
    const pagesRealistic = (await PDFDocument.load(bufRealistic)).getPageCount();

    console.log(
      `ONEPAGE heightPx=${heightPx} (safe<=${SAFE_H}, usable=${PAGE_USABLE_H}) ` +
        `pagesClean=${pagesClean} pagesRealistic=${pagesRealistic} ` +
        `loadedFontFaces=${loadedFontFaces} family=${family} bytes=${bufClean.length}`,
    );

    expect(heightPx, "resume doc not rendered").toBeGreaterThan(50);
    expect(loadedFontFaces, "no web fonts loaded - measurement would use a wrong fallback font").toBeGreaterThan(0);
    expect(bufClean.length, "PDF looks empty - resume doc not captured").toBeGreaterThan(15000);
    expect(pagesClean, `clean print produced ${pagesClean} pages`).toBe(1);
    expect(pagesRealistic, `realistic (headers/footers) print produced ${pagesRealistic} pages`).toBe(1);
    expect(
      heightPx,
      `resume content is ${heightPx}px tall; must be <= ${SAFE_H}px to fit one page with margin. Cut/tighten/combine.`,
    ).toBeLessThanOrEqual(SAFE_H);
  });
});
