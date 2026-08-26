import { describe, it, expect } from "vitest";
import { resume } from "@/content/data";

// Deterministic resume-formatting lint (fast, no browser). Policy updated
// 2026-08-25 after the owner's 33-round taste loop: fused THEME bullets (one
// theme per bullet, several facts fused, up to ~620 chars) replaced the old
// 220-char single-fact style; the current role runs up to 8 theme bullets.
// Verb-first no-pronoun voice and the one-sentence-fragment rule stay. The
// one-page e2e gate handles physical fit; this gates writing style.
const bullets = resume.experience.flatMap((e) => e.points);

describe("resume formatting policy", () => {
  it("has experience bullets", () => {
    expect(bullets.length).toBeGreaterThan(0);
  });

  it("every bullet is verb-first: capitalized, no leading pronoun", () => {
    for (const b of bullets) {
      expect(b.trim().length, "empty bullet").toBeGreaterThan(0);
      expect(/^[A-Z]/.test(b), `bullet must start with a capital action verb: "${b}"`).toBe(true);
      expect(
        /^(I|We|My|Our)\b/.test(b),
        `bullet must not start with a pronoun (use verb-first resume voice): "${b}"`,
      ).toBe(false);
    }
  });

  it("every bullet is one fused theme (<=620 chars, no second sentence)", () => {
    for (const b of bullets) {
      expect(b.length, `bullet too long (${b.length} chars) - tighten or split: "${b}"`).toBeLessThanOrEqual(620);
      // a period followed by a capital = a second sentence; bullets are fragments
      const sentenceBreaks = (b.match(/\.\s+[A-Z]/g) || []).length;
      expect(sentenceBreaks, `bullet must be ONE idea, not multiple sentences: "${b}"`).toBe(0);
    }
  });

  it("nearly every bullet carries a number (stat-packed)", () => {
    const quantified = bullets.filter((b) => /\d/.test(b)).length;
    const unquantified = bullets.length - quantified;
    expect(
      unquantified,
      `${unquantified} bullets have no number; at most 3 may be unquantified (stat-pack the rest)`,
    ).toBeLessThanOrEqual(3);
  });

  it("no role exceeds 8 bullets", () => {
    for (const e of resume.experience) {
      expect(e.points.length, `"${e.title}" has ${e.points.length} bullets (max 8)`).toBeLessThanOrEqual(8);
    }
  });

  it("the summary is no-pronoun and not a wall of text (<= 4 sentences)", () => {
    expect(/^(I|We|My)\b/.test(resume.summary), "summary must not open with a pronoun").toBe(false);
    const sentences = (resume.summary.match(/[.!?](\s|$)/g) || []).length;
    expect(sentences, `summary has ${sentences} sentences; keep it 2-4`).toBeLessThanOrEqual(4);
  });
});
