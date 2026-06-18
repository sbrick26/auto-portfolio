import { describe, it, expect } from "vitest";
import { resume } from "@/content/data";

// Deterministic resume-formatting lint (fast, no browser) encoding researched
// best practices (Harvard MCS, Resume Worded, Teal, Indeed). It exists so the
// resume can never regress into pronoun-led, multi-sentence paragraph bullets
// again. The one-page e2e gate handles physical fit; this gates writing style.
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

  it("every bullet is one tight fragment (<=220 chars, single idea)", () => {
    for (const b of bullets) {
      expect(b.length, `bullet too long (${b.length} chars) - tighten or split: "${b}"`).toBeLessThanOrEqual(220);
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
      `${unquantified} bullets have no number; at most 1 may be unquantified (stat-pack the rest)`,
    ).toBeLessThanOrEqual(1);
  });

  it("no role exceeds 6 bullets", () => {
    for (const e of resume.experience) {
      expect(e.points.length, `"${e.title}" has ${e.points.length} bullets (max 6)`).toBeLessThanOrEqual(6);
    }
  });

  it("the summary is no-pronoun and not a wall of text (<= 4 sentences)", () => {
    expect(/^(I|We|My)\b/.test(resume.summary), "summary must not open with a pronoun").toBe(false);
    const sentences = (resume.summary.match(/[.!?](\s|$)/g) || []).length;
    expect(sentences, `summary has ${sentences} sentences; keep it 2-4`).toBeLessThanOrEqual(4);
  });
});
