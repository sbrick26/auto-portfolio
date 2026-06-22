import { describe, it, expect } from "vitest";
import {
  buildSkillGraph,
  categoryForStack,
  STACK_CATEGORY,
} from "@/lib/skill-graph";
import { skills, projects, type Project } from "@/content/data";

// A FIXED fixture for exact-count assertions, so adding a real project can never
// break the structural tests (same reasoning as activity.test.ts). Live-data
// invariants below run against the real projects[] because they SHOULD hold for
// live data and do not break when projects are merely appended.
const FIXTURE: Project[] = [
  {
    name: "alpha",
    blurb: "",
    stack: ["Python", "MCP", "AWS"], // languages + ai + cloud
    status: "shipped",
  },
  {
    name: "beta",
    blurb: "",
    stack: ["TypeScript", "MCP", "MCP"], // languages + ai (dup MCP collapses)
    status: "shipped",
  },
  {
    name: "gamma",
    blurb: "",
    stack: ["totally-unmapped"], // no mapped token -> dropped entirely
    status: "building",
  },
];

describe("STACK_CATEGORY / categoryForStack", () => {
  it("maps every stack token the live projects use to a real skill category", () => {
    const categories = new Set(skills.map((g) => g.category));
    for (const p of projects) {
      for (const token of p.stack) {
        const mapped = categoryForStack(token);
        expect(mapped, `token "${token}" must be mapped`).toBeDefined();
        expect(categories.has(mapped!)).toBe(true);
      }
    }
  });

  it("only points at categories that exist in skills[]", () => {
    const categories = new Set(skills.map((g) => g.category));
    for (const target of Object.values(STACK_CATEGORY)) {
      expect(categories.has(target)).toBe(true);
    }
  });
});

describe("buildSkillGraph", () => {
  it("keeps skill nodes in skills[] order and only those with a project", () => {
    const graph = buildSkillGraph(FIXTURE);
    // customer-facing has no stack token, so it is absent
    expect(graph.skills.map((s) => s.category)).toEqual([
      "languages + core",
      "ai / agents",
      "cloud + data",
    ]);
  });

  it("drops projects whose every stack token is unmapped", () => {
    const graph = buildSkillGraph(FIXTURE);
    expect(graph.projects.map((p) => p.name)).toEqual(["alpha", "beta"]);
  });

  it("dedupes repeated tokens within one project", () => {
    const graph = buildSkillGraph(FIXTURE);
    const beta = graph.projects.find((p) => p.name === "beta")!;
    expect(beta.categories).toEqual(["languages + core", "ai / agents"]);
    // beta contributes exactly two edges despite listing MCP twice
    const betaIdx = graph.projects.find((p) => p.name === "beta")!.index;
    expect(graph.edges.filter((e) => e.project === betaIdx)).toHaveLength(2);
  });

  it("connects each skill to the projects that used it (by index)", () => {
    const graph = buildSkillGraph(FIXTURE);
    const byCat = Object.fromEntries(graph.skills.map((s) => [s.category, s]));
    // ai / agents: alpha(0) + beta(1)
    expect(byCat["ai / agents"].projects).toEqual([0, 1]);
    // cloud + data: alpha(0) only
    expect(byCat["cloud + data"].projects).toEqual([0]);
    // languages + core: alpha(0) + beta(1)
    expect(byCat["languages + core"].projects).toEqual([0, 1]);
  });

  it("emits one edge per (skill, project) pair, all endpoints valid", () => {
    const graph = buildSkillGraph();
    const cats = new Set(graph.skills.map((s) => s.category));
    const idxs = new Set(graph.projects.map((p) => p.index));
    for (const e of graph.edges) {
      expect(cats.has(e.category)).toBe(true);
      expect(idxs.has(e.project)).toBe(true);
    }
    // every project's category list is fully reflected in the edge set
    const expectedEdges = graph.projects.reduce((s, p) => s + p.categories.length, 0);
    expect(graph.edges).toHaveLength(expectedEdges);
  });

  it("keeps skill.projects consistent with the edge set", () => {
    const graph = buildSkillGraph();
    for (const s of graph.skills) {
      const fromEdges = graph.edges
        .filter((e) => e.category === s.category)
        .map((e) => e.project);
      expect(s.projects).toEqual(fromEdges);
    }
  });

  it("carries each category's skill item names for the sub-label", () => {
    const graph = buildSkillGraph();
    for (const s of graph.skills) {
      const group = skills.find((g) => g.category === s.category)!;
      expect(s.items).toEqual(group.items.map((i) => i.name));
    }
  });

  it("surfaces the real breadth of the live portfolio", () => {
    const graph = buildSkillGraph();
    // sanity: the live data should connect multiple skills to multiple projects
    expect(graph.skills.length).toBeGreaterThanOrEqual(3);
    expect(graph.projects.length).toBeGreaterThanOrEqual(5);
    expect(graph.edges.length).toBeGreaterThan(graph.projects.length);
  });

  it("is deterministic for identical inputs", () => {
    expect(buildSkillGraph()).toEqual(buildSkillGraph());
  });
});
