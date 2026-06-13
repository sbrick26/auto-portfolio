import { describe, it, expect } from "vitest";
import { buildActivity, isoDate, TAG_CATEGORY } from "@/lib/activity";
import { skills } from "@/content/data";
import updatesJson from "@/content/updates.json";
import type { Update } from "@/content/data";

const feed = updatesJson as Update[];

// A fixed "now" one day after the last seeded update keeps these assertions
// deterministic regardless of when the suite runs.
const NOW = "2026-06-13";

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

describe("buildActivity", () => {
  it("returns one row per skill category, in order", () => {
    const grid = buildActivity(feed, NOW);
    expect(grid.rows.map((r) => r.category)).toEqual(skills.map((g) => g.category));
  });

  it("columns span the first update through today with no dead leading days", () => {
    const grid = buildActivity(feed, NOW);
    // earliest seeded update is 2026-06-06; today is 2026-06-13 -> 8 daily columns
    expect(grid.bucketLabels).toEqual([
      "06-06", "06-07", "06-08", "06-09", "06-10", "06-11", "06-12", "06-13",
    ]);
    grid.rows.forEach((r) => {
      expect(r.counts).toHaveLength(grid.bucketLabels.length);
      expect(r.intensities).toHaveLength(grid.bucketLabels.length);
    });
  });

  it("counts real updates per category (no fabricated data)", () => {
    const grid = buildActivity(feed, NOW);
    const byCat = Object.fromEntries(grid.rows.map((r) => [r.category, r]));
    // ai/agents: agents(1) + ibm-i(1) + client-work(3) = 5
    expect(byCat["ai / agents"].total).toBe(5);
    // cloud/devops: infra(1) + pipeline(2) + launch(1) = 4
    expect(byCat["cloud / devops"].total).toBe(4);
    // web/mobile: portfolio(3)
    expect(byCat["web / mobile"].total).toBe(3);
    // leadership/delivery: design(2)
    expect(byCat["leadership / delivery"].total).toBe(2);
    // languages: nothing in the feed maps here -> a fully dormant row
    expect(byCat["languages"].total).toBe(0);
    expect(byCat["languages"].intensities.every((i) => i === 0)).toBe(true);
  });

  it("scales intensity 0-4 against the busiest bucket", () => {
    const grid = buildActivity(feed, NOW);
    // 3 ai/agents updates landed on 2026-06-10 (col index 4) - the busiest cell
    expect(grid.max).toBe(3);
    const ai = grid.rows.find((r) => r.category === "ai / agents")!;
    expect(ai.counts[4]).toBe(3);
    expect(ai.intensities[4]).toBe(4); // busiest -> max intensity
    // a single update rounds to the lowest non-zero step
    const lead = grid.rows.find((r) => r.category === "leadership / delivery")!;
    expect(lead.counts[0]).toBe(1);
    expect(lead.intensities[0]).toBe(1);
    // every intensity stays inside the 0-4 range
    for (const row of grid.rows) {
      for (const level of row.intensities) {
        expect(level).toBeGreaterThanOrEqual(0);
        expect(level).toBeLessThanOrEqual(4);
      }
    }
  });

  it("slides to a fixed recent window when the feed is older than windowDays", () => {
    const grid = buildActivity(feed, NOW, 3);
    // last 3 days only: 06-11, 06-12, 06-13
    expect(grid.bucketLabels).toEqual(["06-11", "06-12", "06-13"]);
    // updates before the window are dropped, so totals shrink
    const ai = grid.rows.find((r) => r.category === "ai / agents")!;
    expect(ai.total).toBe(2); // client-work on 06-11 and 06-12
  });

  it("ignores updates dated in the future relative to now", () => {
    const withFuture: Update[] = [
      ...feed,
      { date: "2027-01-01", time: "00:00", text: "future", tag: "agents" },
    ];
    const grid = buildActivity(withFuture, NOW);
    expect(grid.bucketLabels[grid.bucketLabels.length - 1]).toBe("06-13");
  });

  it("is deterministic for identical inputs", () => {
    expect(buildActivity(feed, NOW)).toEqual(buildActivity(feed, NOW));
  });
});

describe("isoDate", () => {
  it("formats a Date as local YYYY-MM-DD", () => {
    expect(isoDate(new Date(2026, 5, 7))).toBe("2026-06-07");
    expect(isoDate(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});
