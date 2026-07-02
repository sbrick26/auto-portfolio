import { describe, expect, it } from "vitest";
import { buildPortfolioGraph, type BranchId } from "@/lib/portfolio-graph";
import { about, changelog, projects, resume, skills, updates } from "@/content/data";
import { buildPipelineRun } from "@/lib/pipeline";

// The graph is the single seam between content/data.ts and the skill-map
// homepage. These tests pin the data-driven contract: EVERYTHING from the old
// site is mapped, new content lands automatically, and canvas labels stay
// readable as things grow.

const graph = buildPortfolioGraph();

const ALL_BRANCHES: BranchId[] = [
  "about",
  "skills",
  "resume",
  "updates",
  "changelog",
  "projects",
  "pipeline",
  "contact",
];

describe("portfolio graph structure", () => {
  it("has all eight branches, four above and four below the card", () => {
    expect(graph.branches.map((b) => b.id).sort()).toEqual([...ALL_BRANCHES].sort());
    expect(graph.branches.filter((b) => b.dir === -1)).toHaveLength(4);
    expect(graph.branches.filter((b) => b.dir === 1)).toHaveLength(4);
  });

  it("gives every branch a unique column per row (no stacked tiles)", () => {
    for (const dir of [-1, 1] as const) {
      const xs = graph.branches.filter((b) => b.dir === dir).map((b) => b.x);
      expect(new Set(xs).size).toBe(xs.length);
    }
  });

  it("leaf ids are globally unique and branchOfLeaf agrees with ownership", () => {
    const seen = new Set<string>();
    for (const b of graph.branches) {
      for (const leaf of b.leaves) {
        expect(seen.has(leaf.id), `duplicate leaf id ${leaf.id}`).toBe(false);
        seen.add(leaf.id);
        expect(graph.branchOfLeaf[leaf.id]).toBe(b.id);
        expect(graph.leafById[leaf.id]).toBe(leaf);
      }
    }
  });
});

describe("data-driven mapping (nothing from the old site is dropped)", () => {
  it("maps every about note, skill group, project, and resume entry to a leaf", () => {
    expect(graph.branchById.about.leaves).toHaveLength(about.length);
    expect(graph.branchById.skills.leaves).toHaveLength(skills.length);
    expect(graph.branchById.projects.leaves).toHaveLength(projects.length);
    expect(graph.branchById.resume.leaves).toHaveLength(
      resume.experience.length + resume.education.length,
    );
    expect(graph.branchById.contact.leaves).toHaveLength(3);
  });

  it("keeps every experience role's full bullet points in its leaf", () => {
    resume.experience.forEach((e, i) => {
      const leaf = graph.leafById[`resume-${i}`];
      expect(leaf.points).toEqual(e.points);
      expect(leaf.role).toBe(e.title);
    });
  });

  it("keeps every project's stack, metrics, arch, and link in its leaf", () => {
    projects.forEach((p, i) => {
      const leaf = graph.leafById[`project-${i}`];
      expect(leaf.tags).toEqual(p.stack);
      expect(leaf.metrics).toEqual(p.metrics);
      expect(leaf.arch).toEqual(p.arch);
      expect(leaf.link).toBe(p.link);
    });
  });

  it("changelog is panel-only: no canvas leaves, latest versions in rows", () => {
    const b = graph.branchById.changelog;
    expect(b.leaves).toHaveLength(0);
    expect(b.versions?.length).toBe(Math.min(6, changelog.length));
    expect(b.versions?.[0].version).toBe(changelog[0].version);
  });

  it("updates is panel-only and mirrors the whole feed, newest first", () => {
    const b = graph.branchById.updates;
    expect(b.leaves).toHaveLength(0);
    expect(b.feed).toHaveLength(updates.length);
    expect(b.feed?.[0].text).toBe(updates[updates.length - 1].text);
    expect(b.feed?.at(-1)?.text).toBe(updates[0].text);
  });

  it("pipeline is panel-only and mirrors the real run walk", () => {
    const b = graph.branchById.pipeline;
    const run = buildPipelineRun(changelog);
    expect(b.leaves).toHaveLength(0);
    expect(b.flow?.map((s) => s.label)).toEqual(run.stages.map((s) => s.node));
    expect(b.run?.version).toBe(run.version);
    expect(b.run?.idea).toBe(run.idea);
  });

  it("contact leaves carry working hrefs", () => {
    for (const leaf of graph.branchById.contact.leaves) {
      expect(leaf.href).toMatch(/^(https:\/\/|mailto:)/);
    }
  });

  it("the me card exposes profile, status, location, and all three links", () => {
    expect(graph.me.initials).toBe("SB");
    expect(graph.me.location.length).toBeGreaterThan(0);
    expect(graph.me.summary.length).toBeGreaterThan(0);
    expect(graph.me.links).toHaveLength(3);
    for (const l of graph.me.links) expect(l.href).toMatch(/^(https:\/\/|mailto:)/);
  });
});

describe("cross-links (project <-> skill jumps)", () => {
  it("every cross id resolves to a real leaf", () => {
    for (const leaf of Object.values(graph.leafById)) {
      for (const id of leaf.cross ?? []) {
        expect(graph.leafById[id], `${leaf.id} jumps to missing ${id}`).toBeDefined();
      }
    }
  });

  it("project -> skill and skill -> project links are symmetric", () => {
    for (const p of graph.branchById.projects.leaves) {
      for (const skillId of p.cross ?? []) {
        expect(
          graph.leafById[skillId].cross ?? [],
          `${skillId} should link back to ${p.id}`,
        ).toContain(p.id);
      }
    }
    for (const s of graph.branchById.skills.leaves) {
      for (const projectId of s.cross ?? []) {
        expect(
          graph.leafById[projectId].cross ?? [],
          `${projectId} should link back to ${s.id}`,
        ).toContain(s.id);
      }
    }
  });
});

describe("readability guards (design holds as content grows)", () => {
  it("canvas leaf labels stay short enough to render without clipping", () => {
    for (const leaf of Object.values(graph.leafById)) {
      expect(leaf.label.length, `leaf label too long: "${leaf.label}"`).toBeLessThanOrEqual(22);
      expect(leaf.label.length).toBeGreaterThan(0);
    }
  });

  it("branch tile labels stay one short word", () => {
    for (const b of graph.branches) {
      expect(b.label.length, `branch label too long: "${b.label}"`).toBeLessThanOrEqual(10);
    }
  });

  it("authored copy follows the formatting rule: no em or en dashes", () => {
    for (const b of graph.branches) {
      for (const s of [b.label, b.title, b.lead]) {
        expect(s, `em/en dash in "${s}"`).not.toMatch(/[–—]/);
      }
    }
  });

  it("every branch has a non-empty panel lead", () => {
    for (const b of graph.branches) expect(b.lead.length).toBeGreaterThan(10);
  });
});
