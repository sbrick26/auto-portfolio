import { describe, expect, it } from "vitest";
import {
  CARD_EDGE,
  CARD_HALF_W,
  EDGE_EXIT_Y,
  EDGE_X,
  FLOAT_AMP,
  JUNC_Y,
  PILL_GAP,
  WORLD_H,
  WORLD_W,
  fanLeaves,
  fanSubLeaves,
  floatOffset,
  hash,
  trunkPath,
} from "@/lib/skillmap-layout";
import { buildPortfolioGraph, type Branch, type Leaf } from "@/lib/portfolio-graph";

// Deterministic design-principle gates for the canvas: no overlapping nodes,
// clearance around the card and every tile, and the guarantees still hold when
// content GROWS (adding projects/roles must not require design rework).

const graph = buildPortfolioGraph();

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

// Leaves drift up to FLOAT_AMP in each axis, so any static clearance must
// survive both nodes drifting toward each other.
const DRIFT = 2 * FLOAT_AMP;
const MIN_LEAF_GAP = 26 + DRIFT; // dot ~17px + label breathing room
const DISC_R = 29; // branch tile radius

describe("fan geometry (no text or node overlap)", () => {
  it("keeps every branch's leaves apart, even mid-drift", () => {
    for (const b of graph.branches) {
      const fan = fanLeaves(b);
      for (let i = 0; i < fan.length; i++) {
        for (let j = i + 1; j < fan.length; j++) {
          const d = dist(fan[i].bx, fan[i].by, fan[j].bx, fan[j].by);
          expect(
            d,
            `${fan[i].leaf.id} and ${fan[j].leaf.id} are ${Math.round(d)}px apart`,
          ).toBeGreaterThanOrEqual(MIN_LEAF_GAP);
        }
      }
    }
  });

  it("keeps every leaf clear of the center card", () => {
    for (const b of graph.branches) {
      for (const lp of fanLeaves(b)) {
        expect(
          Math.abs(lp.by),
          `${lp.leaf.id} sits over the card`,
        ).toBeGreaterThanOrEqual(CARD_EDGE + 20 + DRIFT);
      }
    }
  });

  it("keeps every leaf clear of every branch tile", () => {
    const tiles = graph.branches.map((b) => ({ x: b.x, y: b.dir * b.y }));
    for (const b of graph.branches) {
      for (const lp of fanLeaves(b)) {
        for (const t of tiles) {
          const d = dist(lp.bx, lp.by, t.x, t.y);
          expect(
            d,
            `${lp.leaf.id} is ${Math.round(d)}px from a tile`,
          ).toBeGreaterThanOrEqual(DISC_R + 12 + DRIFT);
        }
      }
    }
  });

  it("keeps every fan inside the frame the cameras can show", () => {
    for (const b of graph.branches) {
      for (const lp of fanLeaves(b)) {
        expect(Math.abs(lp.bx) + 42, `${lp.leaf.id} escapes horizontally`).toBeLessThanOrEqual(
          WORLD_W / 2,
        );
        // fans open under the focus camera, so they may overshoot the overview
        // frame a little vertically - but only a little
        expect(Math.abs(lp.by) + 30, `${lp.leaf.id} escapes vertically`).toBeLessThanOrEqual(
          WORLD_H / 2 + 45,
        );
      }
    }
  });
});

// point-to-segment distance, for keeping nodes off the connector lines
function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// every trunk polyline as segments, matching trunkPath()'s math
function trunkSegments(b: Branch): [number, number, number, number][] {
  const end = b.dir * (b.y - PILL_GAP);
  if (Math.abs(b.x) > EDGE_X) {
    const sx = Math.sign(b.x) * CARD_HALF_W;
    const ey = b.dir * EDGE_EXIT_Y;
    return [
      [sx, ey, b.x, ey],
      [b.x, ey, b.x, end],
    ];
  }
  const jy = b.dir * JUNC_Y;
  return [
    [0, b.dir * CARD_EDGE, 0, jy],
    [0, jy, b.x, jy],
    [b.x, jy, b.x, end],
  ];
}

describe("second layer (sub-skill web) geometry", () => {
  const allTrunkSegs = graph.branches.flatMap(trunkSegments);
  const tiles = graph.branches.map((b) => ({ x: b.x, y: b.dir * b.y }));

  const subFansOf = (branchId: "skills") => {
    const b = graph.branchById[branchId];
    return fanLeaves(b).map((lp) => ({
      lp,
      subs: fanSubLeaves(lp, graph.subLeavesByParent[lp.leaf.id] ?? []),
    }));
  };

  it("sub-skills stay clear of every tile, the card, and each other", () => {
    for (const { subs } of subFansOf("skills")) {
      for (let i = 0; i < subs.length; i++) {
        const s = subs[i];
        for (const t of tiles) {
          expect(
            dist(s.bx, s.by, t.x, t.y),
            `${s.sub.id} crowds a tile`,
          ).toBeGreaterThanOrEqual(DISC_R + 12 + DRIFT);
        }
        expect(Math.abs(s.by), `${s.sub.id} over the card`).toBeGreaterThanOrEqual(
          CARD_EDGE + 20 + DRIFT,
        );
        for (let j = i + 1; j < subs.length; j++) {
          expect(
            dist(s.bx, s.by, subs[j].bx, subs[j].by),
            `${s.sub.id} vs ${subs[j].sub.id}`,
          ).toBeGreaterThanOrEqual(20 + DRIFT);
        }
      }
    }
  });

  it("sub-skills never sit on another section's trunk lines", () => {
    for (const { subs } of subFansOf("skills")) {
      for (const s of subs) {
        for (const [ax, ay, bx, by] of allTrunkSegs) {
          expect(
            segDist(s.bx, s.by, ax, ay, bx, by),
            `${s.sub.id} sits on a trunk line`,
          ).toBeGreaterThanOrEqual(28);
        }
      }
    }
  });

  it("sub-skills keep clear of their parent's sibling leaves", () => {
    for (const { lp, subs } of subFansOf("skills")) {
      const siblings = fanLeaves(lp.branch).filter((o) => o.leaf.id !== lp.leaf.id);
      for (const s of subs) {
        for (const o of siblings) {
          expect(
            dist(s.bx, s.by, o.bx, o.by),
            `${s.sub.id} crowds ${o.leaf.id}`,
          ).toBeGreaterThanOrEqual(22 + DRIFT);
        }
      }
    }
  });

  it("the web stays inside the deep-focus frame", () => {
    for (const { subs } of subFansOf("skills")) {
      for (const s of subs) {
        expect(Math.abs(s.bx) + 48, `${s.sub.id} escapes horizontally`).toBeLessThanOrEqual(
          WORLD_W / 2 + 60,
        );
        expect(Math.abs(s.by) + 24, `${s.sub.id} escapes vertically`).toBeLessThanOrEqual(460);
      }
    }
  });
});

describe("growth (data-driven: more content, same design)", () => {
  const grown = (base: Branch, count: number): Branch => ({
    ...base,
    leaves: Array.from({ length: count }, (_, i): Leaf => ({
      id: `fake-${i}`,
      branch: base.id,
      label: `Future ${i}`,
      blurb: "",
    })),
  });

  it("a projects branch with 16 entries still fans without collisions", () => {
    const fan = fanLeaves(grown(graph.branchById.projects, 16));
    for (let i = 0; i < fan.length; i++) {
      for (let j = i + 1; j < fan.length; j++) {
        expect(
          dist(fan[i].bx, fan[i].by, fan[j].bx, fan[j].by),
        ).toBeGreaterThanOrEqual(MIN_LEAF_GAP);
      }
      // and still respects the neighboring tiles
      for (const b of graph.branches) {
        expect(dist(fan[i].bx, fan[i].by, b.x, b.dir * b.y)).toBeGreaterThanOrEqual(
          DISC_R + 12 + DRIFT,
        );
      }
    }
  });

  it("a resume branch with 10 roles still clears the card", () => {
    const fan = fanLeaves(grown(graph.branchById.resume, 10));
    for (const lp of fan) {
      expect(Math.abs(lp.by)).toBeGreaterThanOrEqual(CARD_EDGE + 20 + DRIFT);
    }
  });
});

describe("trunks", () => {
  it("edge branches exit the card side; inner branches exit top/bottom", () => {
    for (const b of graph.branches) {
      const d = trunkPath(b);
      if (Math.abs(b.x) > EDGE_X) {
        expect(d.startsWith(`M${Math.sign(b.x) * CARD_HALF_W},`)).toBe(true);
      } else {
        expect(d.startsWith("M0,")).toBe(true);
      }
    }
  });

  it("the two edge trunks on each side use distinct horizontals (no stacking)", () => {
    const edges = graph.branches.filter((b) => Math.abs(b.x) > EDGE_X);
    expect(edges.length).toBe(4);
    const starts = new Set(edges.map((b) => trunkPath(b).split(" ")[0]));
    expect(starts.size).toBe(4);
  });
});

describe("float", () => {
  it("is deterministic and bounded by its amplitude", () => {
    const a = floatOffset("skill-1", 1234, FLOAT_AMP);
    const b = floatOffset("skill-1", 1234, FLOAT_AMP);
    expect(a).toEqual(b);
    expect(Math.abs(a.x)).toBeLessThanOrEqual(FLOAT_AMP);
    expect(Math.abs(a.y)).toBeLessThanOrEqual(FLOAT_AMP);
    expect(hash("skill-1")).toBe(hash("skill-1"));
  });
});

// ---- aspect-adaptive spacing (v3.0.1) ----
// The grid reshapes to the viewport at EVERY size, so the clearance gates must
// hold across the whole range of real screens, not just the base positions.
import {
  BASE_HALF_X,
  BASE_HALF_Y,
  LABEL_PAD_X,
  LABEL_PAD_Y,
  adaptiveScales,
  homeFit,
} from "@/lib/skillmap-layout";

const VIEWPORTS: [number, number][] = [
  [320, 568], // iPhone SE
  [390, 660], // phone with browser chrome
  [390, 844], // tall phone
  [412, 915], // large android
  [640, 700], // the compact/desktop CSS boundary
  [768, 1024], // tablet portrait
  [800, 600], // shrunk desktop window
  [1024, 768],
  [1280, 660], // laptop with browser chrome
  [1440, 900],
  [1920, 1080],
  [2560, 1080], // ultrawide
];

const scaledBranches = (w: number, h: number) => {
  const { sx, sy } = adaptiveScales(w, h);
  return graph.branches.map((b) => ({ ...b, x: b.x * sx, y: b.y * sy }));
};

describe("adaptive spacing", () => {
  it("tracks the viewport shape within its clamps", () => {
    for (const [w, h] of VIEWPORTS) {
      const { sx, sy } = adaptiveScales(w, h);
      expect(sx, `${w}x${h}`).toBeGreaterThanOrEqual(0.55);
      expect(sx, `${w}x${h}`).toBeLessThanOrEqual(1.18);
      expect(sy, `${w}x${h}`).toBeGreaterThanOrEqual(0.85);
      expect(sy, `${w}x${h}`).toBeLessThanOrEqual(2);
    }
    // narrower window -> tighter columns AND taller rows (more vertical)
    const phone = adaptiveScales(390, 844);
    const laptop = adaptiveScales(1440, 900);
    expect(phone.sx).toBeLessThan(laptop.sx);
    expect(phone.sy).toBeGreaterThan(laptop.sy);
    // unmeasured stage falls back to the resting grid
    expect(adaptiveScales(0, 0)).toEqual({ sx: 1, sy: 1 });
    expect(homeFit(0, 0)).toBe(1);
  });

  it("home fit fills the stage without overflowing it", () => {
    for (const [w, h] of VIEWPORTS) {
      const { sx, sy } = adaptiveScales(w, h);
      const fit = homeFit(w, h);
      expect(fit, `${w}x${h}`).toBeGreaterThanOrEqual(0.5);
      expect(fit, `${w}x${h}`).toBeLessThanOrEqual(1.18);
      const hw = BASE_HALF_X * sx + LABEL_PAD_X;
      const hh = BASE_HALF_Y * sy + LABEL_PAD_Y;
      // the resting box never spills off screen at the home zoom...
      expect(2 * hw * fit, `${w}x${h} overflows x`).toBeLessThanOrEqual(w + 1);
      expect(2 * hh * fit, `${w}x${h} overflows y`).toBeLessThanOrEqual(h + 1);
      // ...and unless the zoom cap kicked in, it FILLS one axis
      if (fit < 1.18) {
        const fill = Math.max((2 * hw * fit) / w, (2 * hh * fit) / h);
        expect(fill, `${w}x${h} leaves the screen empty`).toBeGreaterThanOrEqual(0.9);
      }
    }
  });

  it("keeps tiles clear of each other and the card at every shape", () => {
    for (const [w, h] of VIEWPORTS) {
      const tiles = scaledBranches(w, h).map((b) => ({ id: b.id, x: b.x, y: b.dir * b.y }));
      for (let i = 0; i < tiles.length; i++) {
        expect(
          Math.abs(tiles[i].y),
          `${tiles[i].id} rides the card at ${w}x${h}`,
        ).toBeGreaterThanOrEqual(95);
        for (let j = i + 1; j < tiles.length; j++) {
          const d = dist(tiles[i].x, tiles[i].y, tiles[j].x, tiles[j].y);
          expect(
            d,
            `${tiles[i].id} and ${tiles[j].id} collide at ${w}x${h}`,
          ).toBeGreaterThanOrEqual(2 * DISC_R + 6);
        }
      }
    }
  });

  it("keeps every fan's clearances at every viewport shape", () => {
    for (const [w, h] of VIEWPORTS) {
      const { sx } = adaptiveScales(w, h);
      const branches = scaledBranches(w, h);
      const tiles = branches.map((b) => ({ x: b.x, y: b.dir * b.y }));
      for (const b of branches) {
        const fan = fanLeaves(b, sx);
        for (let i = 0; i < fan.length; i++) {
          const lp = fan[i];
          // leaves stay apart even as the fan tilts vertical
          for (let j = i + 1; j < fan.length; j++) {
            const d = dist(lp.bx, lp.by, fan[j].bx, fan[j].by);
            expect(
              d,
              `${lp.leaf.id} and ${fan[j].leaf.id} collide at ${w}x${h}`,
            ).toBeGreaterThanOrEqual(MIN_LEAF_GAP);
          }
          expect(
            Math.abs(lp.by),
            `${lp.leaf.id} sits over the card at ${w}x${h}`,
          ).toBeGreaterThanOrEqual(CARD_EDGE + 20 + DRIFT);
          for (const t of tiles) {
            const d = dist(lp.bx, lp.by, t.x, t.y);
            expect(
              d,
              `${lp.leaf.id} is ${Math.round(d)}px from a tile at ${w}x${h}`,
            ).toBeGreaterThanOrEqual(DISC_R + 8 + DRIFT);
          }
        }
      }
    }
  });
});
