"use client";

// SkillMap - the "Warm Paper Grid Tree" homepage (handoff option 3a).
//
// A center "you" card sits at world (0,0); eight branch nodes sit on a fixed
// grid (four above, four below); each branch fans its leaf nodes out in a
// deterministic straight-spoke arc. Connectors are right-angle trunks (card ->
// branch) and straight spokes (branch -> leaf). The ONLY thing animated frame to
// frame is a small idle drift on the leaves (their spoke endpoints follow). Pan
// by dragging the background, zoom with the wheel, click a node to focus + open
// the slide-in panel. Layout is pure trig (no physics), so adding content to
// content/data.ts just lands in the right place automatically.
//
// Every node is ADDRESSABLE: selecting one pushes a history entry and writes a
// readable hash (#projects/sterling-mcp), back/forward walk the selections, and
// loading a hashed URL boots straight to that node with the camera already
// framed. The same selection plumbing drives keyboard use - focus follows the
// camera, arrows walk the tree, Enter opens the panel, Escape comes back.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { buildPortfolioGraph, type BranchId } from "@/lib/portfolio-graph";
import { ME_NODE_ID, buildNodeUrlMap, hashForNode, nodeIdFromHash } from "@/lib/node-url";
import {
  HOME_PAN_Y,
  adaptiveScales,
  homeFit,
  EDGE_X,
  FLOAT_AMP,
  fanLeaves,
  fanSubLeaves,
  floatOffset,
  trunkPath,
  type LeafPos,
  type Pt,
  type SubPos,
} from "@/lib/skillmap-layout";
import { APP_VERSION } from "@/lib/version";
import { NodePanel } from "./NodePanel";
import { BranchIcon } from "./icons";

const CAM_EASE = 0.18; // camera smoothing toward target

// The address bar IS the selection state, subscribed to as an external store.
// One consequence, and it is the whole point: a click on a node, the back
// button, and a pasted link all travel the exact same path, so the URL and the
// map can never disagree. history.pushState notifies nobody, so the writer
// fires MAP_NAV itself; the browser supplies popstate/hashchange for free.
const MAP_NAV = "skillmap:nav";

function subscribeToHash(onChange: () => void) {
  for (const ev of ["popstate", "hashchange", MAP_NAV]) window.addEventListener(ev, onChange);
  return () => {
    for (const ev of ["popstate", "hashchange", MAP_NAV]) window.removeEventListener(ev, onChange);
  };
}
const readHash = () => window.location.hash;
// the server has no address bar: prerender the plain overview, then let
// hydration adopt whatever the real URL asks for
const readServerHash = () => "";

export function SkillMap() {
  const graph = useMemo(() => buildPortfolioGraph(), []);
  const urlMap = useMemo(() => buildNodeUrlMap(graph), [graph]);

  const hash = useSyncExternalStore(subscribeToHash, readHash, readServerHash);
  const selectedId = useMemo(() => nodeIdFromHash(urlMap, hash), [urlMap, hash]);
  // compact = phone-width stage: drives the CSS mode (bottom-sheet panel,
  // stronger dimming). SPACING is not a binary mode anymore - see stage below.
  const [compact, setCompact] = useState(false);
  // measured stage size; the branch grid reshapes to it continuously, so a
  // shrunk desktop window and a phone adapt by the same rule
  const [stage, setStage] = useState({ w: 0, h: 0 });

  // resolve a selected leaf/sub-leaf/branch id to its owning branch
  const activeBranchId: BranchId | null = selectedId
    ? graph.branchOfLeaf[selectedId] ?? (graph.branchById[selectedId as BranchId] ? (selectedId as BranchId) : null)
    : null;
  const selectedSubId = selectedId && graph.subLeafById[selectedId] ? selectedId : null;
  // a selected sub-skill keeps its PARENT leaf highlighted/expanded in the panel
  const selectedLeafId =
    selectedId && graph.leafById[selectedId]
      ? selectedId
      : selectedSubId
        ? graph.subLeafById[selectedSubId].parent
        : null;

  // ---- layout (pure: positions depend only on the graph + stage shape) ----
  const { sx, sy } = useMemo(() => adaptiveScales(stage.w, stage.h), [stage]);
  const branches = useMemo(
    () => graph.branches.map((b) => ({ ...b, x: b.x * sx, y: b.y * sy })),
    [graph, sx, sy],
  );
  const activeBranch = activeBranchId
    ? branches.find((b) => b.id === activeBranchId) ?? null
    : null;

  const allLeafPositions = useMemo<LeafPos[]>(
    () => branches.flatMap((b) => fanLeaves(b, sx)),
    [branches, sx],
  );
  // world position of every selectable node (for camera focus + cross-jumps)
  const posById = useMemo(() => {
    const m = new Map<string, Pt>();
    m.set("me", { x: 0, y: 0 });
    for (const b of branches) m.set(b.id, { x: b.x, y: b.dir * b.y });
    for (const lp of allLeafPositions) {
      m.set(lp.leaf.id, { x: lp.bx, y: lp.by });
      for (const sp of fanSubLeaves(lp, graph.subLeavesByParent[lp.leaf.id] ?? [])) {
        m.set(sp.sub.id, { x: sp.bx, y: sp.by });
      }
    }
    return m;
  }, [branches, allLeafPositions, graph]);

  // Accordion: only the active branch's leaves are on the canvas; everything
  // else is just the eight tiles + the card. Click a tile to fan it out, click
  // off (background / the tile again) to fold it back in.
  const visibleLeafPositions = useMemo<LeafPos[]>(
    () => (activeBranch ? fanLeaves(activeBranch, sx) : []),
    [activeBranch, sx],
  );

  // Second layer: selecting a skill-group leaf (or one of its sub-skills)
  // fans the group's individual skills out from that leaf - the intricate web.
  const subParentId = selectedSubId
    ? graph.subLeafById[selectedSubId].parent
    : selectedLeafId && (graph.subLeavesByParent[selectedLeafId]?.length ?? 0) > 0
      ? selectedLeafId
      : null;
  const visibleSubPositions = useMemo<SubPos[]>(() => {
    if (!subParentId) return [];
    const parent = visibleLeafPositions.find((lp) => lp.leaf.id === subParentId);
    return parent ? fanSubLeaves(parent, graph.subLeavesByParent[subParentId] ?? []) : [];
  }, [subParentId, visibleLeafPositions, graph]);

  // ---- camera (kept out of React; eased per frame) ----
  const cam = useRef({ panX: 0, panY: 0, scale: 1 });
  const camT = useRef({ panX: 0, panY: 0, scale: 1 });
  const worldRef = useRef<HTMLDivElement | null>(null);
  const worldGRef = useRef<SVGGElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const reduceRef = useRef(false);
  // "home" zoom: fit the whole eight-branch grid into the viewport once, then
  // let pan/zoom take over. Recenter returns here.
  const fitRef = useRef(1);

  const leafElRef = useRef<Map<string, HTMLElement | null>>(new Map());
  const spokeRef = useRef<Map<string, SVGPathElement | null>>(new Map());
  // every node button (card, branches, leaves, sub-leaves) by id - the keyboard
  // walk moves real DOM focus, so it needs the elements themselves
  const nodeElRef = useRef<Map<string, HTMLElement | null>>(new Map());
  // the committed selection, readable from callbacks that outlive a render
  // (the resize listener, the keyboard's return-focus path)
  const selectedRef = useRef<string | null>(null);
  // set until the visitor's first move; while set, a selection arriving from
  // the URL snaps the camera into place instead of easing toward it
  const bootRef = useRef(true);

  // write the camera to the DOM immediately (the rAF loop does this every
  // frame; boot needs it once, before the first paint)
  const paintCamera = useCallback(() => {
    const { w, h } = sizeRef.current;
    const c = cam.current;
    const ox = w / 2 + c.panX;
    const oy = h / 2 + c.panY;
    if (worldRef.current)
      worldRef.current.style.transform = `translate(${ox}px, ${oy}px) scale(${c.scale})`;
    worldGRef.current?.setAttribute("transform", `translate(${ox} ${oy}) scale(${c.scale})`);
  }, []);

  // Point the camera at a node: ZOOM IN on it and center it in the space the
  // panel leaves free (right panel on desktop, bottom sheet on mobile). For a
  // leafy branch, aim past the pill at its fan so the whole spread is in view.
  // Deselecting returns to the fitted overview.
  const focusOn = useCallback(
    (id: string | null) => {
      const fit = fitRef.current;
      if (!id) {
        camT.current = { panX: 0, panY: HOME_PAN_Y * fit, scale: fit };
        return;
      }
      const p = posById.get(id) ?? { x: 0, y: 0 };
      const { w, h } = sizeRef.current;
      const mobile = w > 0 && w < 640;
      const b = graph.branchById[id as BranchId];
      const fx = p.x;
      // aim past a leafy pill at its fan so the whole spread is in view
      // (fans are shorter on narrow stages, so aim closer there)
      const fy = b && b.leaves.length ? p.y + b.dir * (mobile ? 60 : 85) : p.y;
      const s = Math.min(1.25, Math.max(0.95, fit * 1.35));
      const cx = mobile ? 0 : -158; // desktop: shift left, clear of the panel
      const cy = mobile ? -h * 0.21 : 0; // mobile: rise above the PEEK sheet
      camT.current = { scale: s, panX: cx - fx * s, panY: cy - fy * s };
    },
    [posById, graph],
  );

  // ---- selection = navigation (one door, so the URL can never drift) ----

  // EVERY selection change is a navigation: push the node's address, then tell
  // the store. The render that follows moves the panel AND the camera, so there
  // is no second code path for "selected but not addressed". Deselecting drops
  // the hash entirely rather than leaving a bare "#" behind.
  const navigate = useCallback(
    (next: string | null) => {
      if (nodeIdFromHash(urlMap, window.location.hash) === next) return;
      // the first move of the visit is over: from here the camera eases
      bootRef.current = false;
      const hash = hashForNode(urlMap, next);
      if (window.history?.pushState) {
        window.history.pushState(
          null,
          "",
          window.location.pathname + window.location.search + hash,
        );
        window.dispatchEvent(new Event(MAP_NAV));
        return;
      }
      // no pushState (nothing real ships without it): still select, just with a
      // plain hash write. hashchange is already a store source, so this lands on
      // the same single path - the only loss is a bare "#" when deselecting.
      window.location.hash = hash || "#";
    },
    [urlMap],
  );

  const toggleSelect = useCallback(
    (id: string) => {
      const current = nodeIdFromHash(urlMap, window.location.hash);
      navigate(current === id ? null : id);
    },
    [navigate, urlMap],
  );

  // canvas taps also snap the phone sheet back to PEEK - selecting a node on
  // the map means the user is looking at the MAP, so it must stay visible
  const [peekTick, setPeekTick] = useState(0);
  const canvasSelect = useCallback(
    (id: string) => {
      setPeekTick((n) => n + 1);
      toggleSelect(id);
    },
    [toggleSelect],
  );

  // jump straight to a node (panel cross-link: project <-> skill)
  const jumpTo = navigate;

  const deselect = useCallback(() => navigate(null), [navigate]);

  const recenter = useCallback(() => {
    navigate(null);
    camT.current = { panX: 0, panY: HOME_PAN_Y * fitRef.current, scale: fitRef.current };
  }, [navigate]);

  // ---- keyboard: the whole map is operable without a pointer ----
  //
  // Focus DRIVES the camera, so focus can never land on a node that is off
  // screen. Left/right walk siblings (branch ring, leaf fan, sub-skill web),
  // up climbs to the parent, down descends into whatever is already fanned out,
  // Home returns to the card. Enter opens the panel and hands focus to its
  // heading; Escape closes it and puts focus back on the node it came from.

  const [panelFocusKey, setPanelFocusKey] = useState(0);
  // a node that is not on the canvas YET (or is about to fold away) cannot be
  // focused during the keystroke itself; park it here and let the commit that
  // follows hand it the focus
  const pendingFocusRef = useRef<string | null>(null);

  const focusNode = useCallback((id: string) => {
    const el = nodeElRef.current.get(id);
    if (el) el.focus();
    else pendingFocusRef.current = id;
  }, []);

  useLayoutEffect(() => {
    const id = pendingFocusRef.current;
    if (!id) return;
    pendingFocusRef.current = null;
    // a leaf folds away with its branch; fall back to the branch that owns it
    const el = nodeElRef.current.get(id) ?? nodeElRef.current.get(graph.branchOfLeaf[id] ?? "");
    el?.focus();
  });

  const siblingsOf = useCallback(
    (id: string): string[] => {
      if (graph.subLeafById[id]) return visibleSubPositions.map((s) => s.sub.id);
      if (graph.leafById[id]) return visibleLeafPositions.map((lp) => lp.leaf.id);
      if (graph.branchById[id as BranchId]) return branches.map((b) => b.id);
      return [];
    },
    [graph, branches, visibleLeafPositions, visibleSubPositions],
  );

  const parentOf = useCallback(
    (id: string): string | null => {
      if (graph.subLeafById[id]) return graph.subLeafById[id].parent;
      if (graph.leafById[id]) return graph.leafById[id].branch;
      if (graph.branchById[id as BranchId]) return ME_NODE_ID;
      return null;
    },
    [graph],
  );

  // only ever descends into nodes ALREADY on the canvas - an arrow key must
  // never silently change what the map is showing
  const firstChildOf = useCallback(
    (id: string): string | null => {
      if (id === ME_NODE_ID) return branches[0]?.id ?? null;
      if (graph.branchById[id as BranchId])
        return id === activeBranchId ? visibleLeafPositions[0]?.leaf.id ?? null : null;
      if (graph.leafById[id])
        return visibleSubPositions.find((s) => s.parent.leaf.id === id)?.sub.id ?? null;
      return null;
    },
    [graph, branches, activeBranchId, visibleLeafPositions, visibleSubPositions],
  );

  // Enter OPENS (never toggles): Escape is the documented way back out, so a
  // second Enter on the same node cannot leave focus stranded in a closed panel
  const openFrom = useCallback(
    (id: string) => {
      navigate(id);
      setPanelFocusKey((n) => n + 1);
    },
    [navigate],
  );

  // The origin is the LIVE selection, never a remembered one. The panel always
  // shows whatever is selected, so the node the visitor came from is by
  // definition the selected node - and reading it fresh means a selection made
  // through any other door (a click, a panel row, a cross-jump, the back
  // button) cannot leave a stale origin behind to hijack the next Escape.
  const closeToOrigin = useCallback(() => {
    // the close unmounts the fan, so the origin can only be focused afterwards
    if (selectedRef.current) pendingFocusRef.current = selectedRef.current;
    navigate(null);
  }, [navigate]);

  const nodeKeyDown = useCallback(
    (ev: React.KeyboardEvent, id: string) => {
      const k = ev.key;
      if (k === "Enter" || k === " " || k === "Spacebar") {
        ev.preventDefault();
        openFrom(id);
        return;
      }
      if (k === "Escape") {
        ev.preventDefault();
        deselect();
        return;
      }
      let next: string | null = null;
      if (k === "ArrowRight" || k === "ArrowLeft") {
        const ring = siblingsOf(id);
        const i = ring.indexOf(id);
        if (i >= 0) next = ring[(i + (k === "ArrowRight" ? 1 : ring.length - 1)) % ring.length];
      } else if (k === "ArrowDown") next = firstChildOf(id);
      else if (k === "ArrowUp") next = parentOf(id);
      else if (k === "Home") next = ME_NODE_ID;
      else return;
      ev.preventDefault();
      if (next) focusNode(next);
    },
    [openFrom, deselect, siblingsOf, firstChildOf, parentOf, focusNode],
  );

  // tabbing to a node brings it to the middle of the stage (instantly under
  // reduced motion, since focusOn only sets the target the ease chases)
  const nodeProps = useCallback(
    (id: string) => ({
      onFocus: () => focusOn(id),
      onKeyDown: (ev: React.KeyboardEvent) => nodeKeyDown(ev, id),
    }),
    [focusOn, nodeKeyDown],
  );

  // measure the stage and seed the world transform before first paint; on
  // resize, re-fit the overview whenever nothing is selected
  useLayoutEffect(() => {
    let seeded = false;
    const measure = () => {
      const el = stageRef.current;
      if (el) sizeRef.current = { w: el.clientWidth, h: el.clientHeight };
      const { w, h } = sizeRef.current;
      setCompact(w > 0 && w < 640);
      // the grid reshapes to the stage (adaptiveScales) and the home fit
      // fills the stage with the reshaped resting box
      setStage((s) => (s.w === w && s.h === h ? s : { w, h }));
      if (w && h) fitRef.current = homeFit(w, h);
      if (w && h && (!seeded || !selectedRef.current)) {
        if (!seeded) cam.current.scale = fitRef.current;
        seeded = true;
        camT.current = { panX: 0, panY: HOME_PAN_Y * fitRef.current, scale: fitRef.current };
      }
      paintCamera();
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [paintCamera]);

  // The camera answers to the selection, wherever it came from - a tap, the
  // back button, or the URL the visitor arrived on. Also re-aims when the grid
  // reshapes under a selection (resize/rotate), so the camera tracks the node's
  // NEW position instead of its old one.
  useLayoutEffect(() => {
    selectedRef.current = selectedId;
    focusOn(selectedId);
    // A link arriving with a node already named opens ALREADY framed: no glide
    // in from the overview, no flash of the default view. Waits for a MEASURED
    // stage, because before that the grid is still at its seed scales.
    if (bootRef.current && selectedId && stage.w > 0) {
      bootRef.current = false;
      cam.current = { ...camT.current };
      paintCamera();
    }
  }, [selectedId, focusOn, paintCamera, stage.w]);

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

      paintCamera();

      const amp = reduceRef.current ? 0 : FLOAT_AMP;
      for (const lp of visibleLeafPositions) {
        const f = amp ? floatOffset(lp.leaf.id, t, amp) : { x: 0, y: 0 };
        const x = lp.bx + f.x;
        const y = lp.by + f.y;
        const el = leafElRef.current.get(lp.leaf.id);
        if (el) el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        const sp = spokeRef.current.get(lp.leaf.id);
        if (sp) sp.setAttribute("d", `M${lp.branch.x},${lp.branch.dir * lp.branch.y} L${x},${y}`);
      }
      // sub-skills drift too; their spokes track BOTH floating endpoints
      for (const s of visibleSubPositions) {
        const f = amp ? floatOffset(s.sub.id, t, 3) : { x: 0, y: 0 };
        const x = s.bx + f.x;
        const y = s.by + f.y;
        const el = leafElRef.current.get(s.sub.id);
        if (el) el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
        const pf = amp ? floatOffset(s.parent.leaf.id, t, amp) : { x: 0, y: 0 };
        const sp = spokeRef.current.get(s.sub.id);
        if (sp)
          sp.setAttribute("d", `M${s.parent.bx + pf.x},${s.parent.by + pf.y} L${x},${y}`);
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visibleLeafPositions, visibleSubPositions, paintCamera]);

  // zoom, clamped; shared by the wheel, the +/- buttons, and pinch
  const applyZoom = useCallback((next: number, immediacy = 0.5) => {
    const clamped = Math.max(0.4, Math.min(2.2, next));
    camT.current.scale = clamped;
    cam.current.scale += (clamped - cam.current.scale) * immediacy;
  }, []);

  // wheel zoom, centered on the canvas. Non-passive to stop page scroll.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      applyZoom(camT.current.scale * (ev.deltaY < 0 ? 1.08 : 0.926));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  // Touch/pointer gestures: one pointer drags to pan, two pinch to zoom (with
  // midpoint pan), and a tap that never moved deselects. Pointer capture keeps
  // gestures alive when fingers leave the stage.
  const pointers = useRef(new Map<number, Pt>());
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(
    null,
  );
  const pinch = useRef<{
    dist: number;
    scale: number;
    midX: number;
    midY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const onPointerDown = (ev: React.PointerEvent) => {
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    (ev.currentTarget as Element).setPointerCapture?.(ev.pointerId);
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale: camT.current.scale,
        midX: (a.x + b.x) / 2,
        midY: (a.y + b.y) / 2,
        panX: camT.current.panX,
        panY: camT.current.panY,
      };
      drag.current = null; // a pinch is never a tap
    } else if (pointers.current.size === 1) {
      drag.current = {
        x: ev.clientX,
        y: ev.clientY,
        px: camT.current.panX,
        py: camT.current.panY,
        moved: false,
      };
    }
  };
  const onPointerMove = (ev: React.PointerEvent) => {
    if (pointers.current.has(ev.pointerId))
      pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    const pz = pinch.current;
    if (pz && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      applyZoom(pz.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pz.dist), 1);
      const panX = pz.panX + ((a.x + b.x) / 2 - pz.midX);
      const panY = pz.panY + ((a.y + b.y) / 2 - pz.midY);
      camT.current.panX = panX;
      camT.current.panY = panY;
      cam.current.panX = panX;
      cam.current.panY = panY;
      return;
    }
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
  const onPointerUp = (ev: React.PointerEvent) => {
    pointers.current.delete(ev.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      // pinch ended with one finger down: hand off to a pan without a jump,
      // and never let the remaining finger's lift read as a tap
      const [p] = [...pointers.current.values()];
      drag.current = {
        x: p.x,
        y: p.y,
        px: camT.current.panX,
        py: camT.current.panY,
        moved: true,
      };
      return;
    }
    if (pointers.current.size === 0) {
      const d = drag.current;
      drag.current = null;
      if (d && !d.moved) deselect();
    }
  };

  // stop nodes from starting a pan/background-deselect
  const stopDown = (ev: React.PointerEvent) => ev.stopPropagation();

  // Tabbing OUT of the map hands the camera back to the selection (or the
  // overview when nothing is selected). Without this, walking the ring and
  // leaving strands the visitor zoomed on the last node they passed through
  // with nothing open. Moves within the map - to the panel, to the topbar -
  // keep the camera where it is.
  //
  // A pointer landing on the canvas background blurs the focused node with the
  // same null relatedTarget as a real exit, so the gesture in progress is the
  // tiebreak: while the visitor is dragging or pinching, the camera is theirs,
  // and re-aiming mid-gesture would yank a wheel-adjusted zoom back to the
  // node-framing scale. Nodes stopPropagation on pointerdown, so a size of 0
  // here means no background gesture is running.
  const mapBlur = useCallback(
    (ev: React.FocusEvent<HTMLDivElement>) => {
      if (ev.currentTarget.contains(ev.relatedTarget)) return;
      if (pointers.current.size > 0) return;
      focusOn(nodeIdFromHash(urlMap, window.location.hash));
    },
    [focusOn, urlMap],
  );

  const dimmed = (id: BranchId) => activeBranchId !== null && activeBranchId !== id;

  return (
    <div className={`sm-root${compact ? " sm-compact" : ""}`} onBlur={mapBlur}>
      <div className="sm-grain" />
      <div className="sm-vignette" />

      <div
        ref={stageRef}
        className="sm-stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* connectors */}
        <svg className="sm-svg" aria-hidden="true">
          <g ref={worldGRef}>
            {branches.map((b) => (
              <path
                key={`trunk-${b.id}`}
                d={trunkPath(b, EDGE_X * sx)}
                className={`sm-trunk${dimmed(b.id) ? " sm-dim" : ""}${activeBranchId === b.id ? " sm-on" : ""}`}
                style={{ "--sm-b": b.color } as React.CSSProperties}
                fill="none"
              />
            ))}
            {visibleLeafPositions.map((lp) => (
              <path
                key={`spoke-${lp.leaf.id}`}
                ref={(el) => {
                  spokeRef.current.set(lp.leaf.id, el);
                }}
                className="sm-spoke sm-on"
                style={{ "--sm-b": lp.branch.color } as React.CSSProperties}
                fill="none"
              />
            ))}
            {visibleSubPositions.map((s) => (
              <path
                key={`subspoke-${s.sub.id}`}
                ref={(el) => {
                  spokeRef.current.set(s.sub.id, el);
                }}
                className="sm-spoke sm-subspoke sm-on"
                style={{ "--sm-b": s.parent.branch.color } as React.CSSProperties}
                fill="none"
              />
            ))}
          </g>
        </svg>

        {/* nodes */}
        <div ref={worldRef} className="sm-world">
          {/* center card - itself a node with its own panel. The avatar is the
              pixel swaygent (same 8-bit sprite family as the agent dashboard),
              waving hello under a popping chat bubble, ringed by a slow pulse
              of every section's color. */}
          <button
            ref={(el) => {
              nodeElRef.current.set(ME_NODE_ID, el);
            }}
            className={`sm-card${selectedId === ME_NODE_ID ? " sm-on" : ""}`}
            style={{ transform: "translate(0px, 0px) translate(-50%, -50%)" }}
            onPointerDown={stopDown}
            onClick={(ev) => {
              ev.stopPropagation();
              canvasSelect(ME_NODE_ID);
            }}
            {...nodeProps(ME_NODE_ID)}
            aria-label={graph.me.name}
          >
            <div className="sm-card-row">
              <span className="sm-avatar">
                <span className="sm-chat" aria-hidden="true">
                  Hi! Tap me
                </span>
                <span className="sm-sprite" aria-hidden="true">
                  <span className="sm-spr" />
                  <span className="sm-spr-hand" />
                </span>
              </span>
              <span className="sm-card-id">
                <span className="sm-card-name">{graph.me.name}</span>
                <span className="sm-card-role">{graph.me.role}</span>
              </span>
            </div>
            <span className="sm-card-div" aria-hidden="true" />
            <span className="sm-card-hint">
              tap any node to explore. drag to pan, pinch or scroll to zoom.
            </span>
          </button>

          {/* branch nodes; edge tiles carry their caption on the OUTWARD side
              so it never crosses the trunk lines */}
          {branches.map((b) => (
            <button
              key={b.id}
              ref={(el) => {
                nodeElRef.current.set(b.id, el);
              }}
              className={`sm-branch ${b.dir < 0 ? "sm-branch-up" : "sm-branch-down"}${Math.abs(b.x) > EDGE_X * sx ? ` sm-branch-edge ${b.x < 0 ? "sm-branch-left" : "sm-branch-right"}` : ""}${dimmed(b.id) ? " sm-dim" : ""}${activeBranchId === b.id ? " sm-on" : ""}`}
              style={
                {
                  transform: `translate(${b.x}px, ${b.dir * b.y}px) translate(-50%, -50%)`,
                  "--sm-b": b.color,
                } as React.CSSProperties
              }
              onPointerDown={stopDown}
              onClick={(ev) => {
                ev.stopPropagation();
                canvasSelect(b.id);
              }}
              {...nodeProps(b.id)}
              aria-label={b.label}
            >
              <span className="sm-branch-disc">
                <BranchIcon id={b.id} />
              </span>
              <span className="sm-branch-label">{b.label}</span>
            </button>
          ))}

          {/* leaf nodes (only the active branch's, fanned out on selection) */}
          {visibleLeafPositions.map((lp, j) => {
            const { leaf } = lp;
            const sel = selectedId === leaf.id;
            const cls = [
              "sm-leaf",
              `sm-leaf-${leaf.status ?? (leaf.filled ? "filled" : "plain")}`,
              // label on the far side of the spoke: above the dot for up fans,
              // below for down fans, so it never sits on its own line
              lp.branch.dir < 0 ? "sm-leaf-up" : "sm-leaf-down",
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
                  nodeElRef.current.set(leaf.id, el);
                }}
                className={cls}
                style={
                  {
                    // seed the real position so the first frame never flashes
                    // at the origin; the rAF loop takes over for the idle float
                    transform: `translate(${lp.bx}px, ${lp.by}px) translate(-50%, -50%)`,
                    animationDelay: `${j * 40}ms`,
                    "--sm-b": lp.branch.color,
                  } as React.CSSProperties
                }
                onPointerDown={stopDown}
                onClick={(ev) => {
                  ev.stopPropagation();
                  canvasSelect(leaf.id);
                }}
                {...nodeProps(leaf.id)}
                aria-label={leaf.label}
              >
                <span className="sm-leaf-dot">
                  {leaf.status === "active" ? <span className="sm-leaf-pulse" /> : null}
                </span>
                <span className="sm-leaf-label">{leaf.label}</span>
              </button>
            );
          })}

          {/* second layer: the selected skill group's individual skills */}
          {visibleSubPositions.map((s, j) => (
            <button
              key={s.sub.id}
              ref={(el) => {
                leafElRef.current.set(s.sub.id, el);
                nodeElRef.current.set(s.sub.id, el);
              }}
              className={`sm-leaf sm-subleaf ${s.parent.branch.dir < 0 ? "sm-leaf-up" : "sm-leaf-down"}${selectedId === s.sub.id ? " sm-on" : ""}`}
              style={
                {
                  transform: `translate(${s.bx}px, ${s.by}px) translate(-50%, -50%)`,
                  animationDelay: `${80 + j * 30}ms`,
                  "--sm-b": s.parent.branch.color,
                } as React.CSSProperties
              }
              onPointerDown={stopDown}
              onClick={(ev) => {
                ev.stopPropagation();
                canvasSelect(s.sub.id);
              }}
              {...nodeProps(s.sub.id)}
              aria-label={s.sub.full}
            >
              <span className="sm-leaf-dot" />
              <span className="sm-leaf-label">{s.sub.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* chrome */}
      <div className="sm-topbar">
        <button className="sm-recenter" onClick={recenter} aria-label="recenter view">
          Recenter
        </button>
        <button
          className="sm-recenter sm-zoombtn"
          onClick={() => applyZoom(camT.current.scale * 0.82)}
          aria-label="zoom out"
        >
          −
        </button>
        <button
          className="sm-recenter sm-zoombtn"
          onClick={() => applyZoom(camT.current.scale * 1.22)}
          aria-label="zoom in"
        >
          +
        </button>
      </div>
      <div className="sm-brandbar">
        <span className="sm-brand">swayam.map</span>
        <span className="sm-ver">v{APP_VERSION}</span>
      </div>
      <div className="sm-hint">drag to pan · scroll or pinch to zoom · tap a node</div>

      <NodePanel
        branch={activeBranch}
        me={selectedId === ME_NODE_ID ? graph.me : null}
        selectedLeafId={selectedLeafId}
        selectedSubId={selectedSubId}
        subsOf={(id) => graph.subLeavesByParent[id] ?? []}
        onClose={deselect}
        onEscape={closeToOrigin}
        onSelectLeaf={toggleSelect}
        onJump={jumpTo}
        peekTick={peekTick}
        shareHash={hashForNode(urlMap, selectedId)}
        focusHeadingKey={panelFocusKey}
        labelOf={(id) => graph.leafById[id]?.label ?? id}
      />
    </div>
  );
}
