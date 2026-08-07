import { describe, expect, it } from "vitest";
import { buildPortfolioGraph } from "@/lib/portfolio-graph";
import {
  ME_NODE_ID,
  buildNodeUrlMap,
  hashForNode,
  nodeIdFromHash,
  slugify,
} from "@/lib/node-url";

// The address book behind every shareable node URL. The contract is: EVERY
// selectable node has exactly one slug, no two nodes share one, the map round
// trips, and anything a human might type resolves to null instead of throwing.

const graph = buildPortfolioGraph();
const map = buildNodeUrlMap(graph);

/** every id the map can select: the card, the branches, leaves, sub-leaves */
const allNodeIds = [
  ME_NODE_ID,
  ...graph.branches.map((b) => b.id),
  ...graph.branches.flatMap((b) => b.leaves.map((l) => l.id)),
  ...Object.values(graph.subLeavesByParent).flatMap((subs) => subs.map((s) => s.id)),
];

describe("slugify", () => {
  it("makes readable, url-safe segments", () => {
    expect(slugify("Sterling MCP")).toBe("sterling-mcp");
    expect(slugify("AI & Agents")).toBe("ai-and-agents");
    expect(slugify("SQL / Db2")).toBe("sql-db2");
    expect(slugify("RPG → MCP")).toBe("rpg-mcp");
    expect(slugify("  --Trim Me--  ")).toBe("trim-me");
  });

  it("returns an empty string when there is nothing addressable left", () => {
    expect(slugify("→ ↗ ✕")).toBe("");
  });
});

describe("buildNodeUrlMap", () => {
  it("covers every selectable node in the graph", () => {
    for (const id of allNodeIds) {
      expect(map.slugById[id], `no slug for ${id}`).toBeTruthy();
    }
    expect(Object.keys(map.slugById).length).toBe(allNodeIds.length);
  });

  it("round-trips every node id through its slug", () => {
    for (const id of allNodeIds) {
      expect(nodeIdFromHash(map, hashForNode(map, id))).toBe(id);
    }
  });

  it("keeps every slug unique across branches, leaves and sub-leaves", () => {
    const slugs = allNodeIds.map((id) => map.slugById[id]);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("derives readable addresses from the content, not from internal ids", () => {
    expect(map.slugById["project-3"]).toBe("projects/sterling-mcp");
    expect(map.slugById["resume-0"]).toBe("resume/ibm");
    expect(map.idBySlug["skills/mcp-servers"]).toBeTruthy();
    expect(map.slugById[ME_NODE_ID]).toBe("me");
    expect(map.slugById.projects).toBe("projects");
  });

  it("namespaces slugs per branch, so a repeated label is not a collision", () => {
    // "LinkedIn" is both a past role and a contact link
    expect(map.slugById["resume-3"]).toBe("resume/linkedin");
    expect(map.slugById["contact-1"]).toBe("contact/linkedin");
  });

  it("suffixes deterministically when two nodes in a branch share a label", () => {
    const twins = structuredClone(graph);
    const projects = twins.branches.find((b) => b.id === "projects")!;
    projects.leaves = [
      { ...projects.leaves[0], id: "dup-a", label: "Same Name" },
      { ...projects.leaves[0], id: "dup-b", label: "Same Name" },
    ];
    const dupMap = buildNodeUrlMap(twins);
    expect(dupMap.slugById["dup-a"]).toBe("projects/same-name");
    expect(dupMap.slugById["dup-b"]).toBe("projects/same-name-2");
  });

  it("falls back to the node id when a label has no addressable characters", () => {
    const odd = structuredClone(graph);
    const projects = odd.branches.find((b) => b.id === "projects")!;
    projects.leaves = [{ ...projects.leaves[0], id: "project-99", label: "→ ✕" }];
    expect(buildNodeUrlMap(odd).slugById["project-99"]).toBe("projects/project-99");
  });
});

describe("nodeIdFromHash", () => {
  it("is forgiving about how the address is written", () => {
    expect(nodeIdFromHash(map, "#projects/sterling-mcp")).toBe("project-3");
    expect(nodeIdFromHash(map, "projects/sterling-mcp")).toBe("project-3");
    expect(nodeIdFromHash(map, "#/projects/sterling-mcp/")).toBe("project-3");
    expect(nodeIdFromHash(map, "#PROJECTS/Sterling-MCP")).toBe("project-3");
    expect(nodeIdFromHash(map, "#projects%2Fsterling-mcp")).toBe("project-3");
  });

  it("returns null for anything that addresses no node", () => {
    for (const hash of [
      "",
      "#",
      "#/",
      null,
      undefined,
      "#nope",
      "#projects/nope",
      "#projects/sterling-mcp/extra",
      "#%E0%A4%A", // malformed percent-escape: must never throw
      "#<script>alert(1)</script>",
    ]) {
      expect(nodeIdFromHash(map, hash), `expected null for ${String(hash)}`).toBeNull();
    }
  });
});

describe("hashForNode", () => {
  it("is empty for no selection and for an unknown node", () => {
    expect(hashForNode(map, null)).toBe("");
    expect(hashForNode(map, "not-a-node")).toBe("");
  });

  it("prefixes a real node with #", () => {
    expect(hashForNode(map, "project-3")).toBe("#projects/sterling-mcp");
  });
});
