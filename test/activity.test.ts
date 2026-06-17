import { describe, it, expect } from "vitest";
import { buildSkillEvidence, isoDate, TAG_CATEGORY } from "@/lib/activity";
import { skills } from "@/content/data";
import updatesJson from "@/content/updates.json";
import type { Update } from "@/content/data";

const feed = updatesJson as Update[];

// Exact-count / ordering / newest-first assertions run against this FIXED
// fixture, never the live updates.json - so adding a real daily update can never
// break them (that is exactly what broke the 16:00 check-in: a new entry shifted
// the live counts and the newest date). Live-feed invariants below (every tag
// maps to a real category) still run against the real feed, because those SHOULD
// hold for live data and do not break when entries are merely appended.
const FIXTURE: Update[] = [
  // ai / agents: agents(1) + ibm-i(1) + client-work(3) = 5; newest = client-work 2026-06-12
  { date: "2026-06-12", time: "10:00", text: "client-work newest", tag: "client-work" },
  { date: "2026-06-05", time: "09:00", text: "client-work mid", tag: "client-work" },
  { date: "2026-05-20", time: "09:00", text: "client-work old", tag: "client-work" },
  { date: "2026-04-01", time: "09:00", text: "agents entry", tag: "agents" },
  { date: "2026-03-01", time: "09:00", text: "ibm-i entry", tag: "ibm-i" },
  // cloud / devops: infra(1) + pipeline(2) + launch(1) = 4
  { date: "2026-02-01", time: "09:00", text: "infra entry", tag: "infra" },
  { date: "2026-02-02", time: "09:00", text: "pipeline a", tag: "pipeline" },
  { date: "2026-02-03", time: "09:00", text: "pipeline b", tag: "pipeline" },
  { date: "2026-02-04", time: "09:00", text: "launch entry", tag: "launch" },
  // web / mobile: portfolio(3)
  { date: "2026-01-10", time: "09:00", text: "portfolio a", tag: "portfolio" },
  { date: "2026-01-11", time: "09:00", text: "portfolio b", tag: "portfolio" },
  { date: "2026-01-12", time: "09:00", text: "portfolio c", tag: "portfolio" },
  // leadership / delivery: design(2)
  { date: "2026-01-05", time: "09:00", text: "design a", tag: "design" },
  { date: "2026-01-06", time: "09:00", text: "design b", tag: "design" },
  // languages: intentionally none -> a fully dormant skill
];

describe("TAG_CATEGORY", () => {
  it("maps every tag the live feed uses to a real skill category", () => {
    const categories = new Set(skills.map((g) => g.category));
    for (const u of feed) {
      if (!u.tag) continue;
      const mapped = TAG_CATEGORY[u.tag];
      expect(mapped, `tag "${u.tag}" must be mapped`).toBeDefined();
      expect(categories.has(mapped)).toBe(true);
    }
  });

  it("only points at categories that exist in skills[]", () => {
    const categories = new Set(skills.map((g) => g.category));
    for (const target of Object.values(TAG_CATEGORY)) {
      expect(categories.has(target)).toBe(true);
    }
  });
});

describe("buildSkillEvidence", () => {
  it("returns one entry per skill category, in skills[] order", () => {
    const evidence = buildSkillEvidence(feed);
    expect(evidence.map((e) => e.category)).toEqual(skills.map((g) => g.category));
  });

  it("groups updates under the right skill by tag (fixture, stable counts)", () => {
    const byCat = Object.fromEntries(buildSkillEvidence(FIXTURE).map((e) => [e.category, e]));
    // ai/agents: agents(1) + ibm-i(1) + client-work(3) = 5
    expect(byCat["ai / agents"].total).toBe(5);
    // cloud/devops: infra(1) + pipeline(2) + launch(1) = 4
    expect(byCat["cloud / devops"].total).toBe(4);
    // web/mobile: portfolio(3)
    expect(byCat["web / mobile"].total).toBe(3);
    // leadership/delivery: design(2)
    expect(byCat["leadership / delivery"].total).toBe(2);
    // languages: nothing in the feed maps here -> a fully dormant skill
    expect(byCat["languages"].total).toBe(0);
    expect(byCat["languages"].items).toEqual([]);
    expect(byCat["languages"].lastActive).toBeNull();
  });

  it("every evidence item carries the real update fields and a mapped tag", () => {
    const evidence = buildSkillEvidence(feed);
    for (const e of evidence) {
      for (const item of e.items) {
        expect(TAG_CATEGORY[item.tag]).toBe(e.category);
        expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(item.time).toMatch(/^\d{2}:\d{2}$/);
        expect(item.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("orders each skill's evidence newest first and reports lastActive", () => {
    const byCat = Object.fromEntries(buildSkillEvidence(FIXTURE).map((e) => [e.category, e]));
    const ai = byCat["ai / agents"];
    // newest ai/agents update is the 2026-06-12 client-work entry
    expect(ai.items[0].date).toBe("2026-06-12");
    expect(ai.items[0].tag).toBe("client-work");
    expect(ai.lastActive).toBe("2026-06-12");
    // strictly non-increasing date+time down the list
    const keys = ai.items.map((it) => `${it.date} ${it.time}`);
    expect([...keys].sort().reverse()).toEqual(keys);
  });

  it("ignores untagged and unmapped updates", () => {
    const withNoise: Update[] = [
      ...feed,
      { date: "2026-06-13", time: "09:00", text: "no tag", tag: undefined },
      { date: "2026-06-13", time: "09:30", text: "unknown tag", tag: "totally-unmapped" },
    ];
    const total = buildSkillEvidence(withNoise).reduce((s, e) => s + e.total, 0);
    // same as the unmodified feed: the two noise rows are dropped
    expect(total).toBe(buildSkillEvidence(feed).reduce((s, e) => s + e.total, 0));
  });

  it("is deterministic for identical inputs", () => {
    expect(buildSkillEvidence(feed)).toEqual(buildSkillEvidence(feed));
  });
});

describe("isoDate", () => {
  it("formats a Date as local YYYY-MM-DD", () => {
    expect(isoDate(new Date(2026, 5, 7))).toBe("2026-06-07");
    expect(isoDate(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});
