import { describe, expect, it } from "vitest";
import {
  CARD_EDGE,
  CARD_HALF_W,
  EDGE_X,
  FLOAT_AMP,
  WORLD_H,
  WORLD_W,
  fanLeaves,
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
