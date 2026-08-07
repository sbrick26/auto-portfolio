// node-url.ts - the map's address book.
//
// Every selectable node on the skill map gets ONE stable, readable slug so it
// can be linked, bookmarked, and restored: `#projects/sterling-mcp`,
// `#skills/mcp-servers`, `#resume/ibm`. Slugs are derived deterministically
// from the graph (the same source the canvas is built from), so a project or
// role added to content/data.ts becomes shareable with zero extra edits.
//
// Pure + framework-free on purpose: the component owns history and the camera,
// this module only owns the id <-> slug mapping. Parsing is deliberately
// forgiving (case, stray slashes, percent-encoding) and NEVER throws - a
// hand-edited URL resolves to null and the map falls back to its home view.

import type { PortfolioGraph } from "@/lib/portfolio-graph";

/** The center card is a node like any other, and owns the shortest address. */
export const ME_NODE_ID = "me";

export interface NodeUrlMap {
  /** node id -> slug path, e.g. "project-3" -> "projects/sterling-mcp" */
  slugById: Record<string, string>;
  /** slug path -> node id (lowercase keys) */
  idBySlug: Record<string, string>;
}

/**
 * Human label -> url-safe segment. Ampersands read as "and" (so "AI & Agents"
 * addresses as `ai-and-agents`); everything else non-alphanumeric collapses to
 * a single hyphen.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Claim a slug inside a branch, suffixing deterministically on collision. */
function claim(taken: Set<string>, base: string, fallback: string): string {
  const root = base || slugify(fallback) || "node";
  if (!taken.has(root)) {
    taken.add(root);
    return root;
  }
  for (let n = 2; ; n++) {
    const candidate = `${root}-${n}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
  }
}

/**
 * Build the whole address book from the graph: the center card, the eight
 * branches, every leaf, and every sub-leaf. Slug namespaces are per branch, so
 * a project and a skill may share a caption without fighting over an address.
 */
export function buildNodeUrlMap(graph: PortfolioGraph): NodeUrlMap {
  const slugById: Record<string, string> = {};
  const idBySlug: Record<string, string> = {};

  const add = (id: string, path: string) => {
    slugById[id] = path;
    idBySlug[path] = id;
  };

  add(ME_NODE_ID, ME_NODE_ID);

  for (const branch of graph.branches) {
    add(branch.id, branch.id);
    // one namespace per branch, shared by its leaves and their sub-leaves so
    // no two nodes under the same branch can resolve to the same address
    const taken = new Set<string>();
    for (const leaf of branch.leaves) {
      add(leaf.id, `${branch.id}/${claim(taken, slugify(leaf.label), leaf.id)}`);
      for (const sub of graph.subLeavesByParent[leaf.id] ?? []) {
        add(sub.id, `${branch.id}/${claim(taken, slugify(sub.full), sub.id)}`);
      }
    }
  }

  return { slugById, idBySlug };
}

/** The address bar hash for a node ("" when there is nothing selected). */
export function hashForNode(map: NodeUrlMap, id: string | null): string {
  if (!id) return "";
  const slug = map.slugById[id];
  return slug ? `#${slug}` : "";
}

/**
 * Resolve a location hash back to a node id, or null when it addresses
 * nothing. Tolerates a missing "#", surrounding slashes, mixed case, and
 * broken percent-encoding - a URL a human typed must never throw.
 */
export function nodeIdFromHash(map: NodeUrlMap, hash: string | null | undefined): string | null {
  if (!hash) return null;
  let raw = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // malformed escape ("%E0%A4%A"): fall through with the literal text, which
    // simply will not match any slug
  }
  const path = raw.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!path) return null;
  return map.idBySlug[path] ?? null;
}
