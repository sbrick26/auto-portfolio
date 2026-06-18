import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

// The resume MUST fit ONE printed Letter page in a real browser save-as-PDF.
// A headless page.pdf alone is NOT trustworthy: if the web font has not loaded,
// Chromium falls back to a narrower system font, the content looks shorter, and
// it silently "fits" one page while the owner's real browser (with the real
// font) spills to two. So this gate is deliberately strict:
//   1. wait for document.fonts.ready (render with the SAME font the owner sees),
//   2. measure the printable .resume-doc at the true print content width,
//   3. require it to fit one page WITH a safety margin (so marginal real-browser
//      differences still fit), AND
//   4. require page.pdf (preferCSSPageSize -> honors @page Letter/0.45in) to be
//      exactly one page with real content.
// Letter @ 0.45in margins => content box 7.6in x 10.1in => ~730 x ~970 CSS px.
const PRINT_W = 720; // 7.5in usable width at 96 CSS px/in (@page 0.5in margins)
const PAGE_USABLE_H = 960; // 10in usable height at @page 0.5in margins
// Real browsers add print-dialog overhead the @page rule can't control: default
// "Headers and footers" (~0.66in) and possibly wider default margins (up to 1in).
// Worst realistic case = 1in margins + headers/footers => ~800px usable. Target
// that so the resume lands on ONE page regardless of the owner's print settings.
const SAFE_H = 800;

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
    await page
      .getByRole("button", { name: "print or save the resume as a PDF" })
      .first()
      .click();
    await expect(page.locator(".resume-doc")).toBeAttached({ timeout: 5_000 });

    // Render with the REAL fonts and the print stylesheet, exactly as it prints.
    await page.evaluate(async () => {
      await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready;
    });
    await page.emulateMedia({ media: "print" });

    const heightPx = await page.evaluate(() => {
      const el = document.querySelector(".resume-doc") as HTMLElement | null;
      return el ? Math.ceil(el.getBoundingClientRect().height) : -1;
    });

    const buf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    const pageCount = (await PDFDocument.load(buf)).getPageCount();

    console.log(
      `ONEPAGE heightPx=${heightPx} (safe<=${SAFE_H}, usable=${PAGE_USABLE_H}) pageCount=${pageCount} pdfBytes=${buf.length}`,
    );

    expect(heightPx, "resume doc not rendered").toBeGreaterThan(50);
    expect(buf.length, "PDF looks empty - resume doc not captured").toBeGreaterThan(15000);
    expect(pageCount, `page.pdf produced ${pageCount} pages`).toBe(1);
    expect(
      heightPx,
      `resume content is ${heightPx}px tall; must be <= ${SAFE_H}px to fit one page with margin. Cut/tighten/combine lower-weighted lines.`,
    ).toBeLessThanOrEqual(SAFE_H);
  });
});
