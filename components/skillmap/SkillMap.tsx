"use client";

// SkillMap - the "Warm Paper Grid Tree" homepage (handoff option 3a).
//
// A center "you" card sits at world (0,0); six branch nodes sit on a fixed grid
// (three above, three below); each branch fans its leaf nodes out in a
// deterministic straight-spoke arc. Connectors are right-angle trunks (card ->
// branch) and straight spokes (branch -> leaf). The ONLY thing animated frame to
// frame is a small idle drift on the leaves (their spoke endpoints follow). Pan
// by dragging the background, zoom with the wheel, click a node to focus + open
// the slide-in panel. Layout is pure trig (no physics), so adding content to
// content/data.ts just lands in the right place automatically.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  buildPortfolioGraph,
  type Branch,
  type BranchId,
  type Leaf,
} from "@/lib/portfolio-graph";
import { APP_VERSION } from "@/lib/version";
import { NodePanel } from "./NodePanel";
import { BranchIcon } from "./icons";

const PILL_Y = 180; // |branch y| from the card
const CARD_EDGE = 64; // trunk leaves the card at this y offset
const JUNC_Y = 110; // shared horizontal "bus" row
const PILL_NEAR = 160; // trunk stops just shy of the branch node
const CAM_EASE = 0.18; // camera smoothing toward target

interface Pt {
  x: number;
  y: number;
}
interface LeafPos {
  leaf: Leaf;
  branch: Branch;
  bx: number;
  by: number;
}

// Deterministic straight-spoke fan for a branch's leaves (handoff math).
function fanLeaves(branch: Branch): LeafPos[] {
  const n = branch.leaves.length;
  if (n === 0) return [];
  const halfSpread = Math.min(80, 25 + n * 9);
  const R = 122 + Math.max(0, n - 4) * 14;
  const angStep = n > 1 ? (2 * halfSpread) / (n - 1) : 0;
  const outward = branch.dir < 0 ? -90 : 90;
  const pillY = branch.dir * PILL_Y;
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

// Cheap deterministic per-node phase, so each leaf drifts on its own loop.
function hash(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 997;
  return n;
}
function floatOffset(id: string, t: number, amp: number): Pt {
  const p = hash(id);
  return { x: amp * Math.sin(t * 0.0009 + p), y: amp * Math.cos(t * 0.0011 + p * 1.3) };
}

export function SkillMap() {
  const graph = useMemo(() => buildPortfolioGraph(), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // resolve a selected leaf/branch id to its owning branch (panel + highlight)
  const activeBranchId: BranchId | null = selectedId
    ? graph.branchOfLeaf[selectedId] ?? (graph.branchById[selectedId as BranchId] ? (selectedId as BranchId) : null)
    : null;
  const activeBranch = activeBranchId ? graph.branchById[activeBranchId] : null;
  const selectedLeafId = selectedId && graph.leafById[selectedId] ? selectedId : null;

  // ---- layout (pure: positions never depend on what's visible) ----
  const allLeafPositions = useMemo<LeafPos[]>(
    () => graph.branches.flatMap(fanLeaves),
    [graph],
  );
  // world position of every selectable node (for camera focus + cross-jumps)
  const posById = useMemo(() => {
    const m = new Map<string, Pt>();
    m.set("me", { x: 0, y: 0 });
    for (const b of graph.branches) m.set(b.id, { x: b.x, y: b.dir * PILL_Y });
    for (const lp of allLeafPositions) m.set(lp.leaf.id, { x: lp.bx, y: lp.by });
    return m;
  }, [graph, allLeafPositions]);

  // Accordion: only the active branch's leaves are on the canvas; everything
  // else is just the six tiles + the card. Click a tile to fan it out, click
  // off (background / the tile again) to fold it back in.
  const visibleLeafPositions = useMemo<LeafPos[]>(
    () => (activeBranch ? fanLeaves(activeBranch) : []),
    [activeBranch],
  );

  // ---- camera (kept out of React; eased per frame) ----
  const cam = useRef({ panX: 0, panY: 0, scale: 1 });
  const camT = useRef({ panX: 0, panY: 0, scale: 1 });
  const worldRef = useRef<HTMLDivElement | null>(null);
  const worldGRef = useRef<SVGGElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const reduceRef = useRef(false);

  const leafElRef = useRef<Map<string, HTMLElement | null>>(new Map());
  const spokeRef = useRef<Map<string, SVGPathElement | null>>(new Map());

  // point the camera at a node (gentle partial nudge, clears the right panel),
  // or recenter when nothing is selected.
  const focusOn = useCallback(
    (id: string | null) => {
      if (!id) {
        camT.current = { panX: 0, panY: 0, scale: 1 };
        return;
      }
      const p = posById.get(id) ?? { x: 0, y: 0 };
      camT.current = { scale: 0.92, panX: -50 - p.x * 0.25, panY: -p.y * 0.15 };
    },
    [posById],
  );

  const toggleSelect = useCallback(
    (id: string) => {
      setSelectedId((prev) => {
        const next = prev === id ? null : id;
        focusOn(next);
        return next;
      });
    },
    [focusOn],
  );

  // jump straight to a node (panel cross-link: project <-> skill)
  const jumpTo = useCallback(
    (id: string) => {
      setSelectedId(id);
      focusOn(id);
    },
    [focusOn],
  );

  const deselect = useCallback(() => {
    setSelectedId(null);
    focusOn(null);
  }, [focusOn]);

  const recenter = useCallback(() => {
    setSelectedId(null);
    camT.current = { panX: 0, panY: 0, scale: 1 };
  }, []);

  // measure the stage and seed the world transform before first paint
  useLayoutEffect(() => {
    const measure = () => {
      const el = stageRef.current;
      if (el) sizeRef.current = { w: el.clientWidth, h: el.clientHeight };
      const { w, h } = sizeRef.current;
      const c = cam.current;
      const tf = `translate(${w / 2 + c.panX}px, ${h / 2 + c.panY}px) scale(${c.scale})`;
      if (worldRef.current) worldRef.current.style.transform = tf;
      worldGRef.current?.setAttribute(
        "transform",
        `translate(${w / 2 + c.panX} ${h / 2 + c.panY}) scale(${c.scale})`,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // honor reduced-motion
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduceRef.current = mq.matches;
    const on = () => (reduceRef.current = mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // render loop: ease camera, drift leaves, drag their spoke endpoints along
  useEffect(() => {
    let raf = 0;
    const step = () => {
      const t =
        typeof performance !== "undefined" ? performance.now() : 0;
      const c = cam.current;
      const ct = camT.current;
      const e = reduceRef.current ? 1 : CAM_EASE;
      c.panX += (ct.panX - c.panX) * e;
      c.panY += (ct.panY - c.panY) * e;
      c.scale += (ct.scale - c.scale) * e;

      const { w, h } = sizeRef.current;
      const ox = w / 2 + c.panX;
      const oy = h / 2 + c.panY;
      if (worldRef.current)
        worldRef.current.style.transform = `translate(${ox}px, ${oy}px) scale(${c.scale})`;
      worldGRef.current?.setAttribute("transform", `translate(${ox} ${oy}) scale(${c.scale})`);

      const amp = reduceRef.current ? 0 : 4;
      for (const lp of visibleLeafPositions) {
        const f = amp ? floatOffset(lp.leaf.id, t, amp) : { x: 0, y: 0 };
        const x = lp.bx + f.x;
        const y = lp.by + f.y;
        const el = leafElRef.current.get(lp.leaf.id);
        if (el) el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        const sp = spokeRef.current.get(lp.leaf.id);
        if (sp) sp.setAttribute("d", `M${lp.branch.x},${lp.branch.dir * PILL_Y} L${x},${y}`);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visibleLeafPositions]);

  // wheel zoom, centered on the canvas (clamped). Non-passive to stop page scroll.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const f = ev.deltaY < 0 ? 1.08 : 0.926;
      const next = Math.max(0.55, Math.min(2.2, camT.current.scale * f));
      camT.current.scale = next;
      cam.current.scale += (next - cam.current.scale) * 0.5; // a touch of immediacy
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // background drag = pan; a click that didn't move = deselect
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(
    null,
  );
  const onPointerDown = (ev: React.PointerEvent) => {
    drag.current = {
      x: ev.clientX,
      y: ev.clientY,
      px: camT.current.panX,
      py: camT.current.panY,
      moved: false,
    };
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
  };
  const onPointerMove = (ev: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = ev.clientX - d.x;
    const dy = ev.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    camT.current.panX = d.px + dx;
    camT.current.panY = d.py + dy;
    cam.current.panX = d.px + dx;
    cam.current.panY = d.py + dy;
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) deselect();
  };

  // stop nodes from starting a pan/background-deselect
  const stopDown = (ev: React.PointerEvent) => ev.stopPropagation();

  const dimmed = (id: BranchId) => activeBranchId !== null && activeBranchId !== id;

  return (
    <div className="sm-root">
      <div className="sm-grain" />
      <div className="sm-vignette" />

      <div
        ref={stageRef}
        className="sm-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* connectors */}
        <svg className="sm-svg" aria-hidden="true">
          <g ref={worldGRef}>
            {graph.branches.map((b) => {
              const trunk = `M0,${b.dir * CARD_EDGE} V${b.dir * JUNC_Y} H${b.x} V${b.dir * PILL_NEAR}`;
              return (
                <path
                  key={`trunk-${b.id}`}
                  d={trunk}
                  className={`sm-trunk${dimmed(b.id) ? " sm-dim" : ""}${activeBranchId === b.id ? " sm-on" : ""}`}
                  fill="none"
                />
              );
            })}
            {visibleLeafPositions.map((lp) => (
              <path
                key={`spoke-${lp.leaf.id}`}
                ref={(el) => {
                  spokeRef.current.set(lp.leaf.id, el);
                }}
                className="sm-spoke sm-on"
                fill="none"
              />
            ))}
          </g>
        </svg>

        {/* nodes */}
        <div ref={worldRef} className="sm-world">
          {/* center card - itself a node with its own panel */}
          <button
            className={`sm-card${selectedId === "me" ? " sm-on" : ""}`}
            style={{ transform: "translate(0px, 0px) translate(-50%, -50%)" }}
            onPointerDown={stopDown}
            onClick={(ev) => {
              ev.stopPropagation();
              toggleSelect("me");
            }}
            aria-label={graph.me.name}
          >
            <div className="sm-card-row">
              <span className="sm-avatar">
                <span className="sm-avatar-dot" />
                {graph.me.initials}
              </span>
              <span className="sm-card-id">
                <span className="sm-card-name">{graph.me.name}</span>
                <span className="sm-card-role">{graph.me.role}</span>
              </span>
            </div>
            <span className="sm-card-div" />
            <span className="sm-card-status">
              <span className="sm-status-dot" />
              {graph.me.status}
            </span>
          </button>

          {/* branch nodes */}
          {graph.branches.map((b) => (
            <button
              key={b.id}
              className={`sm-branch ${b.dir < 0 ? "sm-branch-up" : "sm-branch-down"}${dimmed(b.id) ? " sm-dim" : ""}${activeBranchId === b.id ? " sm-on" : ""}`}
              style={{ transform: `translate(${b.x}px, ${b.dir * PILL_Y}px) translate(-50%, -50%)` }}
              onPointerDown={stopDown}
              onClick={(ev) => {
                ev.stopPropagation();
                toggleSelect(b.id);
              }}
              aria-label={b.label}
            >
              <span className="sm-branch-disc">
                <BranchIcon id={b.id} />
              </span>
              <span className="sm-branch-label">{b.label}</span>
            </button>
          ))}

          {/* leaf nodes (only the active branch's, fanned out on selection) */}
          {visibleLeafPositions.map((lp) => {
            const { leaf } = lp;
            const sel = selectedId === leaf.id;
            const cls = [
              "sm-leaf",
              `sm-leaf-${leaf.status ?? (leaf.filled ? "filled" : "plain")}`,
              dimmed(lp.branch.id) ? "sm-dim" : "",
              sel ? "sm-on" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                key={leaf.id}
                ref={(el) => {
                  leafElRef.current.set(leaf.id, el);
                }}
                className={cls}
                onPointerDown={stopDown}
                onClick={(ev) => {
                  ev.stopPropagation();
                  toggleSelect(leaf.id);
                }}
                aria-label={leaf.label}
              >
                <span className="sm-leaf-dot">
                  {leaf.status === "active" ? <span className="sm-leaf-pulse" /> : null}
                </span>
                <span className="sm-leaf-label">{leaf.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* chrome */}
      <div className="sm-topbar">
        <button className="sm-recenter" onClick={recenter} aria-label="recenter view">
          Recenter
        </button>
      </div>
      <div className="sm-brandbar">
        <span className="sm-brand">swayam.map</span>
        <span className="sm-ver">v{APP_VERSION}</span>
      </div>
      <div className="sm-hint">drag to pan · scroll to zoom · click a node</div>

      <NodePanel
        branch={activeBranch}
        me={selectedId === "me" ? graph.me : null}
        selectedLeafId={selectedLeafId}
        onClose={deselect}
        onSelectLeaf={toggleSelect}
        onJump={jumpTo}
        labelOf={(id) => graph.leafById[id]?.label ?? id}
      />
    </div>
  );
}
