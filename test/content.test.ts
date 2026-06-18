import { describe, it, expect } from "vitest";
import { profile, about, skills, projects, updates, resume, changelog } from "@/content/data";

describe("updates feed (pipeline seam)", () => {
  it("has at least one entry", () => {
    expect(updates.length).toBeGreaterThan(0);
  });

  it("every entry has a valid date, time, and text", () => {
    for (const u of updates) {
      expect(u.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(u.time).toMatch(/^\d{2}:\d{2}$/);
      expect(u.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("is ordered oldest to newest (the tail renders top-down)", () => {
    const stamps = updates.map((u) => `${u.date} ${u.time}`);
    expect([...stamps].sort()).toEqual(stamps);
  });
});

describe("skills", () => {
  it("every level is within 0-100", () => {
    for (const g of skills) {
      for (const s of g.items) {
        expect(s.level).toBeGreaterThanOrEqual(0);
        expect(s.level).toBeLessThanOrEqual(100);
      }
    }
  });

  it("every group has a category, accent, and at least one item", () => {
    for (const g of skills) {
      expect(g.category.length).toBeGreaterThan(0);
      expect(g.accent).toContain("var(--color-");
      expect(g.items.length).toBeGreaterThan(0);
    }
  });
});

describe("projects", () => {
  it("every project has a valid status", () => {
    for (const p of projects) {
      expect(["live", "building", "shipped", "archived"]).toContain(p.status);
    }
  });

  it("links, when present, are https", () => {
    for (const p of projects) {
      if (p.link) expect(p.link).toMatch(/^https:\/\//);
    }
  });

  it("every project has a name, blurb, and stack", () => {
    for (const p of projects) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.blurb.length).toBeGreaterThan(10);
      expect(p.stack.length).toBeGreaterThan(0);
    }
  });
});

describe("changelog (pipeline seam)", () => {
  it("entries are well-formed and newest-first", () => {
    expect(changelog.length).toBeGreaterThan(0);
    for (const e of changelog) {
      expect(e.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.changes.length).toBeGreaterThan(0);
    }
    const semver = (v: string) => v.split(".").map(Number);
    for (let i = 1; i < changelog.length; i++) {
      const [a, b] = [semver(changelog[i - 1].version), semver(changelog[i].version)];
      const newer = a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] > b[2])));
      expect(newer, `${changelog[i - 1].version} must be newer than ${changelog[i].version}`).toBe(true);
    }
  });

  it("the newest changelog entry matches the package version", async () => {
    const pkg = await import("../package.json");
    expect(changelog[0].version).toBe(pkg.version);
  });
});

describe("privacy guard: nothing sensitive ships to the public site", () => {
  const everything = JSON.stringify({ profile, about, skills, projects, updates, resume });

  it("contains no phone number", () => {
    expect(everything).not.toMatch(/\(\d{3}\)\s?\d{3}[- ]?\d{4}/);
    expect(everything).not.toMatch(/\d{3}[- ]\d{3}[- ]\d{4}/);
  });

  it("contains no client names (engagements stay generalized)", () => {
    // base64-encoded so this public test file does not itself name the clients
    const clientNames = [
      "THVjaWRMaW5r",
      "U3Rlcmxpbmc=",
      "SUJNIFN0ZXJsaW5n",
      "U3RlcmxpbmcgT3JkZXIgTWFuYWdlbWVudA==",
      "TWlkV2VzdCBQYXJ0cw==",
      "TWlkV2VzdCBQYXJ0cyBDbw==",
      "TVdQQVJUUw==",
      "UEcmRQ==",
      "UEdF",
      "UGFjaWZpYyBHYXMgYW5kIEVsZWN0cmlj",
      "UGFjaWZpYyBHYXMgJiBFbGVjdHJpYw==",
      "ZVBsdXM=",
      "Q29sb3JhZG8gUEVSQQ==",
      "TmlhZ2FyYQ==",
      "VEtP",
      "V1dF",
      "VUZD",
      "S25pZ2h0IFN3aWZ0",
      "S25pZ2h0LVN3aWZ0",
      "VVMgWHByZXNz",
      "UEFDQ0FS",
      "QUFBIENvb3Blcg==",
      "UEVSQQ==",
      "Wk9NRQ==",
    ].map((s) => Buffer.from(s, "base64").toString());
    for (const name of clientNames) {
      expect(everything.toLowerCase(), `client name "${name}" must not appear`).not.toContain(
        name.toLowerCase()
      );
    }
  });

  it("uses only the public email", () => {
    expect(everything).not.toContain(Buffer.from("dXRleGFzLmVkdQ==", "base64").toString());
    expect(profile.links.email).toBe("swayambarik@gmail.com");
  });

  it("github links point at sbrick26", () => {
    expect(profile.links.github).toContain("github.com/sbrick26");
    for (const p of projects) {
      if (p.link?.includes("github.com")) expect(p.link).toContain("sbrick26");
    }
  });

  it("contains no leftover TODO text in user-visible strings", () => {
    // blurbs/points/summaries must never render the word TODO to a visitor
    const visible = JSON.stringify({ profile, about, projects, resume, updates });
    expect(visible).not.toMatch(/TODO/);
  });
});
