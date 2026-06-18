import { describe, it, expect } from "vitest";
import { resumeToPlainText } from "@/lib/resume-export";
import { profile, resume, skills } from "@/content/data";

describe("resumeToPlainText (copy-to-clipboard serializer)", () => {
  const text = resumeToPlainText();

  it("leads with the candidate's name, role, and public contact", () => {
    const head = text.split("\n");
    expect(head[0]).toBe(profile.name);
    expect(head[1]).toBe(profile.role);
    expect(text).toContain(profile.links.email);
    expect(text).toContain(profile.location);
  });

  it("includes the summary and every section heading", () => {
    expect(text).toContain(resume.summary);
    for (const heading of ["SUMMARY", "EXPERIENCE", "SKILLS", "EDUCATION"]) {
      expect(text).toContain(heading);
    }
  });

  it("includes every experience entry, its dates, and its bullets", () => {
    for (const e of resume.experience) {
      expect(text).toContain(e.title);
      if (e.when) expect(text).toContain(e.when);
      if (e.org) expect(text).toContain(e.org);
      for (const pt of e.points) expect(text).toContain(pt);
    }
  });

  it("lists every skill grouped by category", () => {
    for (const g of skills) {
      expect(text).toContain(g.category);
      for (const s of g.items) expect(text).toContain(s.name);
    }
  });

  it("includes education entries", () => {
    for (const e of resume.education) {
      expect(text).toContain(e.title);
    }
  });

  it("is clean plain text: no markdown, html, or terminal color markers", () => {
    expect(text).not.toMatch(/[*#`<>]/);
    expect(text).not.toContain("var(--color");
    expect(text).not.toContain("text-term");
  });

  it("matches the on-screen resume content exactly (export must not edit it)", () => {
    // The resume itself only changes when warranted; this export adds an
    // affordance, never new copy. Guard that the serializer invents nothing.
    expect(text).toContain(resume.summary);
    const bulletCount = (text.match(/^- /gm) ?? []).length;
    const expected = resume.experience.reduce((n, e) => n + e.points.length, 0);
    expect(bulletCount).toBe(expected);
  });

  it("ends with a single trailing newline", () => {
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });
});
