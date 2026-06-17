import { describe, it, expect } from "vitest";
import { buildPipelineRun } from "@/lib/pipeline";
import type { ChangelogEntry } from "@/content/data";

// A fixed fixture so exact assertions never break when a real changelog entry is
// appended (same discipline as test/activity.test.ts).
const FIXTURE: ChangelogEntry[] = [
  { version: "2.3.0", date: "2026-06-15", changes: ["headline idea", "second change"] },
  { version: "2.2.0", date: "2026-06-14", changes: ["older idea"] },
];

describe("buildPipelineRun", () => {
  it("returns the full fixed node sequence, owner-first, deploy-last", () => {
    const run = buildPipelineRun(FIXTURE);
    expect(run.stages.map((s) => s.key)).toEqual([
      "owner",
      "front",
      "lead",
      "ideation",
      "build",
      "reviewer",
      "ci",
      "preview",
      "approval",
      "deploy",
    ]);
  });

  it("has unique stage keys", () => {
    const keys = buildPipelineRun(FIXTURE).stages.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every stage carries an accent css var and a non-empty token", () => {
    for (const s of buildPipelineRun(FIXTURE).stages) {
      expect(s.accent).toContain("var(--color-");
      expect(s.token.length).toBeGreaterThan(0);
      expect(s.node.length).toBeGreaterThan(0);
      expect(s.detail.length).toBeGreaterThan(0);
    }
  });

  it("pulls the run's idea, version, and date from the newest changelog entry", () => {
    const run = buildPipelineRun(FIXTURE);
    expect(run.version).toBe("2.3.0");
    expect(run.date).toBe("2026-06-15");
    expect(run.idea).toBe("headline idea");
  });

  it("the deploy node's token is the shipped version", () => {
    const run = buildPipelineRun(FIXTURE);
    expect(run.stages.at(-1)?.token).toBe("v2.3.0");
  });

  it("truncates a long idea so the layout can't blow out", () => {
    const long = "x".repeat(200);
    const run = buildPipelineRun([{ version: "1.0.0", date: "2026-01-01", changes: [long] }]);
    expect(run.idea.length).toBeLessThanOrEqual(88);
    expect(run.idea.endsWith("…")).toBe(true);
  });

  it("falls back to neutral placeholders for an empty feed", () => {
    const run = buildPipelineRun([]);
    expect(run.version).toBe("0.0.0");
    expect(run.idea).toBe("a daily improvement");
    expect(run.stages).toHaveLength(10);
  });
});
