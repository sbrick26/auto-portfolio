// Pure, deterministic layout math for the skill-map canvas. Kept out of the
// component so geometry (leaf spacing, fan radii, clearance from the card and
// neighboring branches) is unit-testable: same graph -> same positions, and the
// tests in test/skillmap-layout.test.ts gate overlap/readability as content
// grows. The render layer (camera, idle float, DOM) lives in
// components/skillmap/SkillMap.tsx.

import type { Branch, Leaf, SubLeaf } from "@/lib/portfolio-graph";

export const CARD_EDGE = 41; // trunk meets the card edge (card is ~82px tall)
export const JUNC_Y = 95; // shared horizontal "bus" row
export const PILL_GAP = 20; // trunk stops this short of the pill center
export const FLOAT_AMP = 4; // idle drift amplitude (px)
export const CARD_HALF_W = 119; // half the center card width (side trunk exits)
export const EDGE_X = 300; // |x| beyond this = edge branch (side-exit trunk)
export const EDGE_EXIT_Y = 26; // side exits sit above/below the card midline

// World extents the camera fits on load: outer branches plus fans + labels
// across, pills plus fans + labels down. The circle is an ARC: edge branches
// sit closer in x but further out in y than the inner pair, so the whole map
// hugs typical screen proportions instead of one wide flat row.
export const WORLD_W = 960;
export const WORLD_H = 700;

// Compact (phone) mode: branch columns pull inward so the card + all eight
// tiles fit a narrow screen WITHOUT panning; canvas fans are skipped there
// (the panel lists every leaf) so nothing collides at the tighter pitch.
export const COMPACT_X = 0.62;
export const COMPACT_WORLD_W = 650;
export const COMPACT_WORLD_H = 500;

// Connector from the center card to a branch pill, following wherever the pill
// sits (the stems are dynamic: move a branch and its trunk redraws). Inner
// branches drop from the card's top/bottom edge onto a shared bus row; EDGE
// branches exit the card's SIDE (up-row slightly above the midline, down-row
// slightly below) and run straight out, so the four corner stems never stack
// on the bus lines. Pass a scaled edgeX when the columns are scaled (compact).
export function trunkPath(
  branch: { x: number; y: number; dir: -1 | 1 },
  edgeX: number = EDGE_X,
): string {
  const end = branch.dir * (branch.y - PILL_GAP);
  if (Math.abs(branch.x) > edgeX) {
    const sx = Math.sign(branch.x) * CARD_HALF_W;
    return `M${sx},${branch.dir * EDGE_EXIT_Y} H${branch.x} V${end}`;
  }
  return `M0,${branch.dir * CARD_EDGE} V${branch.dir * JUNC_Y} H${branch.x} V${end}`;
}

export interface Pt {
  x: number;
  y: number;
}

export interface LeafPos {
  leaf: Leaf;
  branch: Branch;
  bx: number;
  by: number;
}

// Deterministic straight-spoke fan for a branch's leaves (handoff math). The
// spread and radius both grow with the leaf count, so a branch keeps its leaves
// apart no matter how many entries land in content/data.ts.
export function fanLeaves(branch: Branch): LeafPos[] {
  const n = branch.leaves.length;
  if (n === 0) return [];
  // spread caps at 58deg per side: any wider and a large fan reaches sideways
  // into the arc's corner tiles (the geometry tests gate this)
  const halfSpread = Math.min(58, 25 + n * 9);
  const R = 122 + Math.max(0, n - 4) * 14;
  const angStep = n > 1 ? (2 * halfSpread) / (n - 1) : 0;
  const outward = branch.dir < 0 ? -90 : 90;
  const pillY = branch.dir * branch.y;
  return branch.leaves.map((leaf, j) => {
    const angDeg = outward + (j - (n - 1) / 2) * angStep;
    const rad = (angDeg * Math.PI) / 180;
    return {
      leaf,
      branch,
      bx: branch.x + R * Math.cos(rad),
      by: pillY + R * Math.sin(rad),
    };
  });
}

export interface SubPos {
  sub: SubLeaf;
  parent: LeafPos;
  bx: number;
  by: number;
}

// Second-layer fan: a leaf's sub-skills spread around the leaf's outward
// bearing, CLAMPED to within 30deg of straight out (up for top branches, down
// for bottom). Edge parents would otherwise aim their web sideways into a
// corner tile or another section's trunk; instead the spokes run longer and
// more vertical, where there is always clean space. Deterministic, sized by
// count, and gated by the sub-layer geometry tests.
const SUB_MAX_OFF = (30 * Math.PI) / 180;

export function fanSubLeaves(parent: LeafPos, subs: SubLeaf[]): SubPos[] {
  const n = subs.length;
  if (n === 0) return [];
  const pillY = parent.branch.dir * parent.branch.y;
  const raw = Math.atan2(parent.by - pillY, parent.bx - parent.branch.x);
  const out = parent.branch.dir < 0 ? -Math.PI / 2 : Math.PI / 2;
  const bearing = out + Math.max(-SUB_MAX_OFF, Math.min(SUB_MAX_OFF, raw - out));
  const half = (Math.min(44, 12 + n * 6) * Math.PI) / 180;
  const R = 112 + Math.max(0, n - 4) * 11;
  const step = n > 1 ? (2 * half) / (n - 1) : 0;
  return subs.map((sub, j) => {
    const a = bearing + (j - (n - 1) / 2) * step;
    return { sub, parent, bx: parent.bx + R * Math.cos(a), by: parent.by + R * Math.sin(a) };
  });
}

// Cheap deterministic per-node phase, so each leaf drifts on its own loop.
export function hash(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 997;
  return n;
}

export function floatOffset(id: string, t: number, amp: number): Pt {
  const p = hash(id);
  return { x: amp * Math.sin(t * 0.0009 + p), y: amp * Math.cos(t * 0.0011 + p * 1.3) };
}
