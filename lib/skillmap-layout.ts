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

// World extents open fans may reach (gated by the world-bounds tests). The
// camera no longer fits these on load - the home view fits the RESTING box
// below - but fans must still stay inside a sane world for the focus zoom.
export const WORLD_W = 960;
export const WORLD_H = 700;

// ---- aspect-adaptive spacing ----
// The resting content box (eight tiles + captions + card) is rescaled so its
// SHAPE tracks the viewport shape at every size - phone, shrunk desktop
// window, ultrawide - and the home fit then fills the screen with it. One
// continuous rule, no phone-only special case: columns pull in as the window
// narrows while rows push out, so the whole circle is always visible at once
// and uses the screen.
export const BASE_HALF_X = 330; // widest tile column at rest (edge tiles)
export const BASE_HALF_Y = 205; // tallest tile row at rest (edge tiles)
export const LABEL_PAD_X = 118; // edge captions: disc + gap + text + side margin
export const LABEL_PAD_Y = 56; // top/bottom captions + tile halo
const BASE_ASPECT = (BASE_HALF_X + LABEL_PAD_X) / (BASE_HALF_Y + LABEL_PAD_Y);

// Column/row scale pair for a viewport. The aspect correction is split across
// both axes (sqrt) so neither direction distorts alone; the row scale then
// solves the remainder exactly. Clamps keep the pitch readable: columns never
// tighter than 0.55, rows between 0.85 and 1.8 times the resting spacing (any
// taller and the edge rows ride the screen edges instead of framing the card).
// Screen chrome the map must clear at the home zoom: the recenter/zoom
// controls up top, the brand + hint row along the bottom. The home camera
// centers the grid inside this SAFE box (offset by HOME_PAN_Y), so the About
// tile never hides under the controls.
export const SAFE_TOP = 54;
export const SAFE_BOTTOM = 34;
export const HOME_PAN_Y = (SAFE_TOP - SAFE_BOTTOM) / 2;

export function adaptiveScales(w: number, h: number): { sx: number; sy: number } {
  if (!w || !h) return { sx: 1, sy: 1 };
  const sh = Math.max(1, h - SAFE_TOP - SAFE_BOTTOM);
  const k = w / sh / BASE_ASPECT;
  const sx = Math.max(0.55, Math.min(1.18, Math.sqrt(k)));
  const hw = BASE_HALF_X * sx + LABEL_PAD_X;
  const sy = Math.max(0.85, Math.min(1.8, (hw * (sh / w) - LABEL_PAD_Y) / BASE_HALF_Y));
  return { sx, sy };
}

// Home ("recenter") zoom: fill the safe box with the rescaled resting grid.
// The floor keeps tiny windows readable; the cap keeps huge screens from
// ballooning the tiles.
export function homeFit(w: number, h: number): number {
  if (!w || !h) return 1;
  const sh = Math.max(1, h - SAFE_TOP - SAFE_BOTTOM);
  const { sx, sy } = adaptiveScales(w, h);
  const hw = BASE_HALF_X * sx + LABEL_PAD_X;
  const hh = BASE_HALF_Y * sy + LABEL_PAD_Y;
  return Math.max(0.45, Math.min(1.18, (0.97 * w) / (2 * hw), (0.97 * sh) / (2 * hh)));
}

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
// apart no matter how many entries land in content/data.ts. When the columns
// are pulled in (sx < 1, narrow viewports), the fan stays WIDE but the spokes
// SHORTEN: an open fan owns the stage (its neighbors fade back), so width is
// free space while the vertical room above the bottom sheet is scarce. sx = 1
// reproduces the resting fan exactly.
export function fanLeaves(branch: Branch, sx = 1): LeafPos[] {
  const n = branch.leaves.length;
  if (n === 0) return [];
  // spread caps at 58deg per side: any wider and a large fan reaches sideways
  // into the arc's corner tiles (the geometry tests gate this)
  const halfSpread = Math.min(58, 25 + n * 9);
  const t = Math.max(0, Math.min(1, (sx - 0.55) / 0.45));
  const R0 = 122 + Math.max(0, n - 4) * 14;
  const R = R0 * (0.78 + 0.22 * t);
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
