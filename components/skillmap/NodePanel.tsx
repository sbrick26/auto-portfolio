"use client";

// The slide-in detail panel. Shows the ACTIVE BRANCH as a list of rows (one per
// leaf), highlighting the selected leaf and expanding its full detail in place -
// so every fact from the old site (project metrics/arch/stack/links, full
// resume bullets + the PDF/plain-text export, skill items, changelog notes, the
// live updates feed, the pipeline walk, contact links) is reachable here. Rows
// stay in sync with the canvas selection, and the panel scrolls the selected
// row into view when the selection comes from the canvas. Clicking the center
// card opens the profile ("me") view instead of a branch.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Branch, Leaf, PanelMe, SubLeaf } from "@/lib/portfolio-graph";
import { resumeToPlainText } from "@/lib/resume-export";
import { PipeIcon } from "./icons";

// How many changelog versions show before the "show all" fold (same idea as
// the old terminal's tail + show-all affordance).
const CHANGELOG_RECENT = 6;

const ARCH_TINT: Record<string, string> = {
  actor: "var(--sm-accent)",
  gateway: "var(--sm-blue)",
  guard: "var(--sm-coral)",
  system: "var(--sm-green)",
  store: "var(--sm-violet)",
  io: "var(--sm-gold)",
};

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function NodePanel({
  branch,
  me,
  selectedLeafId,
  selectedSubId,
  subsOf,
  onClose,
  onSelectLeaf,
  onJump,
  labelOf,
  peekTick = 0,
}: {
  branch: Branch | null;
  me: PanelMe | null;
  selectedLeafId: string | null;
  selectedSubId: string | null;
  subsOf: (leafId: string) => SubLeaf[];
  onClose: () => void;
  onSelectLeaf: (id: string) => void;
  onJump: (id: string) => void;
  labelOf: (id: string) => string;
  peekTick?: number;
}) {
  const open = !!branch || !!me;

  // When the selection comes from the canvas (or a cross-jump), bring the
  // matching row into view so the panel and the map always agree. Scroll the
  // panel BODY explicitly: scrollIntoView would also scroll the map's
  // overflow:hidden stage/root ancestors and shear the whole layout upward.
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!selectedLeafId) return;
    const body = bodyRef.current;
    const row = body?.querySelector<HTMLElement>(".sm-row-on");
    if (!body || !row) return;
    // the selected section always LEADS the panel - especially on the peek
    // sheet, where only the first stretch of the body is visible
    const top =
      row.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
    body.scrollTo({ top: Math.max(0, top - 10), behavior: "smooth" });
  }, [selectedLeafId]);

  // Phone bottom sheet: opens at HALF height (peek) so the map and the
  // selected node stay visible, drag the grab bar up for the full panel,
  // drag down to return to peek and again to dismiss. Desktop ignores the
  // sheet classes entirely (the grab bar is display:none there).
  const asideRef = useRef<HTMLElement | null>(null);
  const [sheet, setSheet] = useState<"peek" | "full">("peek");
  const sheetDrag = useRef<{ y0: number; base: number; h: number } | null>(null);
  // every fresh open starts back at peek, and every CANVAS tap (peekTick)
  // snaps back to peek so the map stays visible (render-phase reset)
  const [prevOpen, setPrevOpen] = useState(open);
  const [prevTick, setPrevTick] = useState(peekTick);
  if (open !== prevOpen || peekTick !== prevTick) {
    setPrevOpen(open);
    setPrevTick(peekTick);
    if (open) setSheet("peek");
  }

  // sheet gestures apply only when the panel IS a sheet (narrow viewport);
  // jsdom has no matchMedia, so tests take the sheet path
  const isSheet = () =>
    typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 640px)").matches : true;

  const grabDown = (e: React.PointerEvent) => {
    const el = asideRef.current;
    if (!el || !isSheet()) return;
    // a press on a real button (close, chips...) is never a sheet gesture -
    // engaging here would swallow or distort the button's own click
    if ((e.target as Element).closest?.("button")) return;
    // capture so a release outside the bar/header still ends the drag
    // cleanly (a stale drag would leave the sheet glued to the pointer)
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const h = el.clientHeight || 1;
    sheetDrag.current = { y0: e.clientY, base: sheet === "peek" ? h * 0.52 : 0, h };
    el.style.transition = "none";
  };
  const grabMove = (e: React.PointerEvent) => {
    const d = sheetDrag.current;
    const el = asideRef.current;
    if (!d || !el) return;
    const y = Math.max(0, Math.min(d.h * 0.64, d.base + (e.clientY - d.y0)));
    el.style.transform = `translateY(${y}px)`;
  };
  // clearing the inline transform hands off to the class snap point; the
  // restored transition animates from wherever the finger left it
  const grabSettle = () => {
    const el = asideRef.current;
    if (el) {
      el.style.transition = "";
      el.style.transform = "";
    }
  };
  const grabUp = (e: React.PointerEvent) => {
    const d = sheetDrag.current;
    sheetDrag.current = null;
    if (!d) return;
    grabSettle();
    const dy = e.clientY - d.y0;
    if (Math.abs(dy) < 6) {
      // a plain tap/click on the bar or the header toggles the snap point -
      // the discoverable path for mouse users (buttons keep their own job)
      if (!(e.target as Element).closest?.("button")) {
        setSheet(sheet === "peek" ? "full" : "peek");
      }
    } else if (dy < -40) setSheet("full");
    else if (dy > 40) {
      if (sheet === "full") setSheet("peek");
      else onClose();
    }
  };
  // a canceled gesture (browser took over the pointer) must never toggle
  const grabCancel = () => {
    sheetDrag.current = null;
    grabSettle();
  };
  const grabKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setSheet(sheet === "peek" ? "full" : "peek");
    }
  };
  const sheetHandlers = {
    onPointerDown: grabDown,
    onPointerMove: grabMove,
    onPointerUp: grabUp,
    onPointerCancel: grabCancel,
  };

  return (
    <aside
      ref={asideRef}
      className={`sm-panel sm-sheet-${sheet}${open ? " sm-panel-open" : ""}`}
      aria-hidden={!open}
      style={branch ? ({ "--sm-b": branch.color } as React.CSSProperties) : undefined}
    >
      <div
        className="sm-grab"
        {...sheetHandlers}
        onKeyDown={grabKey}
        role="button"
        tabIndex={open ? 0 : -1}
        aria-label={sheet === "peek" ? "expand panel" : "collapse panel"}
      >
        <span className="sm-grab-pill" />
        <svg
          className={`sm-grab-chev${sheet === "full" ? " sm-grab-chev-down" : ""}`}
          viewBox="0 0 12 6"
          width="12"
          height="6"
          aria-hidden="true"
        >
          <path
            d="M1 5 L6 1 L11 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {me ? (
        <>
          <header className="sm-panel-head" {...sheetHandlers}>
            <div>
              <div className="sm-kicker">{me.role}</div>
              <h3 className="sm-panel-title">{me.name}</h3>
            </div>
            <button className="sm-panel-x" onClick={onClose} aria-label="close panel">
              ✕
            </button>
          </header>
          <div className="sm-panel-body">
            <div className="sm-me-status">
              <span className="sm-status-dot" />
              {me.location}
            </div>
            <p className="sm-lead">{me.summary}</p>
            <DemoButton demo={me.demo} />
            <div className="sm-me-links">
              {me.links.map((l) => (
                <a
                  key={l.label}
                  className="sm-linkbtn"
                  href={l.href}
                  target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel="noreferrer"
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          </div>
        </>
      ) : branch ? (
        <>
          <header className="sm-panel-head" {...sheetHandlers}>
            <div>
              <div className="sm-kicker">{branch.label}</div>
              <h3 className="sm-panel-title">{branch.title}</h3>
            </div>
            <button className="sm-panel-x" onClick={onClose} aria-label="close panel">
              ✕
            </button>
          </header>
          <div className="sm-panel-body" ref={bodyRef}>
            <p className="sm-lead">{branch.lead}</p>

            {branch.id === "changelog" ? (
              <ChangelogList versions={branch.versions ?? []} />
            ) : branch.id === "updates" ? (
              <ul className="sm-rowlist">
                {(branch.feed ?? []).map((u, i) => (
                  <li key={i} className="sm-row sm-row-static">
                    <div className="sm-row-head">
                      <span className="sm-feed-when">
                        {u.date}
                        {u.time ? ` · ${u.time}` : ""}
                      </span>
                      {u.tag ? <span className="sm-row-tag">{u.tag}</span> : null}
                    </div>
                    <p className="sm-row-blurb">{u.text}</p>
                  </li>
                ))}
              </ul>
            ) : branch.id === "pipeline" ? (
              <PipelineFlow branch={branch} />
            ) : (
              <ul className="sm-rowlist">
                {branch.leaves.map((leaf) => (
                  <PanelRow
                    key={leaf.id}
                    leaf={leaf}
                    selected={selectedLeafId === leaf.id}
                    subs={subsOf(leaf.id)}
                    selectedSubId={selectedSubId}
                    onSelect={onSelectLeaf}
                    onJump={onJump}
                    labelOf={labelOf}
                  />
                ))}
              </ul>
            )}

            {branch.id === "resume" ? <ResumeActions /> : null}
          </div>
        </>
      ) : null}
    </aside>
  );
}

// "Watch the demo" - the automatic-portfolio pipeline, filmed. Two cuts exist;
// phone-width screens get the vertical one. Decided when the panel opens
// (this only ever renders client-side, after the card is tapped). Plays in an
// in-site lightbox, never a new tab; the S3 objects are the untouched original
// exports, so the native player streams the footage at full quality.
function DemoButton({ demo }: { demo: PanelMe["demo"] }) {
  const [src] = useState(() =>
    window.matchMedia?.("(max-width: 640px)").matches ? demo.vertical : demo.horizontal,
  );
  const [open, setOpen] = useState(false);
  return (
    <div className="sm-demo">
      <button type="button" className="sm-linkbtn sm-linkbtn-solid" onClick={() => setOpen(true)}>
        ▶ Watch the demo
      </button>
      <span className="sm-demo-cap">the automatic portfolio pipeline, end to end</span>
      {open ? <DemoModal src={src} onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

// The lightbox: a dark stage over the map with the native video controls
// (scrub, volume, pip) plus an explicit full screen affordance. Escape, the
// close button, or a tap on the backdrop all return to the map. Portaled to
// <body> so the panel's own stacking and transforms cannot clip it.
function DemoModal({ src, onClose }: { src: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fullscreen = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    // iOS Safari has no element.requestFullscreen; its native player has its own
    type IOSVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    if (v.requestFullscreen) void v.requestFullscreen().catch(() => {});
    else (v as IOSVideo).webkitEnterFullscreen?.();
  }, []);

  return createPortal(
    <div
      className="sm-vmodal"
      role="dialog"
      aria-modal="true"
      aria-label="demo video"
      onClick={onClose}
    >
      <div className="sm-vmodal-box" onClick={(e) => e.stopPropagation()}>
        <div className="sm-vmodal-bar">
          <span className="sm-vmodal-title">the automatic portfolio pipeline</span>
          <button
            type="button"
            className="sm-vmodal-btn"
            onClick={fullscreen}
            aria-label="play full screen"
          >
            ⛶ full screen
          </button>
          <button
            type="button"
            className="sm-vmodal-btn"
            onClick={onClose}
            aria-label="close video"
          >
            ✕
          </button>
        </div>
        <video
          ref={videoRef}
          className="sm-vmodal-video"
          src={src}
          controls
          autoPlay
          playsInline
          preload="metadata"
        />
      </div>
    </div>,
    document.body,
  );
}

// The changelog rows, newest first, with the old terminal's "show all" fold:
// the latest few render immediately, the full history is one tap away.
function ChangelogList({
  versions,
}: {
  versions: { version: string; date: string; changes: string[] }[];
}) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? versions : versions.slice(0, CHANGELOG_RECENT);
  const hidden = versions.length - shown.length;
  return (
    <>
      <ul className="sm-rowlist">
        {shown.map((v) => (
          <li key={v.version} className="sm-row sm-row-static">
            <div className="sm-row-head">
              <span className="sm-row-label">v{v.version}</span>
              <span className="sm-row-tag">{v.date}</span>
            </div>
            <ul className="sm-bullets">
              {v.changes.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      {hidden > 0 ? (
        <button type="button" className="sm-linkbtn sm-showall" onClick={() => setShowAll(true)}>
          show all {versions.length} versions
        </button>
      ) : null}
    </>
  );
}

// The pipeline walk, ANIMATED like the old terminal diagram: a pulse advances
// through the real lifecycle stages on a steady cadence, lighting each row (its
// own glyph + its own tint) and the traveling token as it arrives. The panel
// follows the pulse down the list and jumps back to the top when the loop
// wraps - because the system never stops shipping. Static (all rows lit) under
// prefers-reduced-motion. Rows are plain stacked cards, so it reads the same on
// a phone sheet and a desktop panel.
const FLOW_STEP_MS = 1400;
const FLOW_TINTS = [
  "var(--sm-accent)",
  "var(--sm-blue)",
  "var(--sm-violet)",
  "var(--sm-gold)",
  "var(--sm-coral)",
  "var(--sm-green)",
];

function PipelineFlow({ branch }: { branch: Branch }) {
  const flow = branch.flow ?? [];
  const [step, setStep] = useState(0);
  // decided once on mount: this component only ever renders client-side,
  // after the pipeline tile is tapped
  const [animate] = useState(
    () =>
      flow.length > 1 && !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
  );
  const rowsRef = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (!animate) return;
    const t = setInterval(() => setStep((s) => (s + 1) % flow.length), FLOW_STEP_MS);
    return () => clearInterval(t);
  }, [animate, flow.length]);

  // follow the pulse: keep each lit row inside the VISIBLE part of the panel
  // body (on the peek sheet only a strip of the body is on screen, so the
  // walk must scroll within that strip), scrolling ONLY the body - see the
  // selection effect above. When the loop wraps, jump back to the top.
  useEffect(() => {
    if (!animate) return;
    const row = rowsRef.current[step];
    const body = row?.closest(".sm-panel-body");
    if (!row || !body) return;
    // at peek the list is hidden (the stepper shows instead) - nothing to follow
    if (row.offsetHeight === 0) return;
    if (step === 0) {
      body.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const bodyRect = body.getBoundingClientRect();
    const visibleH = Math.max(
      120,
      Math.min(bodyRect.bottom, window.innerHeight) - bodyRect.top,
    );
    const top = row.getBoundingClientRect().top - bodyRect.top + body.scrollTop;
    if (top < body.scrollTop) {
      body.scrollTo({ top: Math.max(0, top - 8), behavior: "smooth" });
      return;
    }
    const bottomOver = top + row.clientHeight - (body.scrollTop + visibleH);
    if (bottomOver > 0) {
      body.scrollTo({ top: body.scrollTop + bottomOver + 10, behavior: "smooth" });
    }
  }, [step, animate]);

  return (
    <>
      {/* peek-sheet stepper: EVERY stage as an icon, the live one lit in its
          tint with its name + detail below - the whole walk reads in the
          half-open strip. The full list takes over when expanded. */}
      {animate ? (
        <div className="sm-flowstep" aria-hidden="true">
          <div className="sm-flowstep-icons">
            {flow.map((s, i) => (
              <span
                key={i}
                className={`sm-flowstep-dot${i === step ? " sm-flowstep-on" : ""}`}
                style={{ "--flow-tint": FLOW_TINTS[i % FLOW_TINTS.length] } as React.CSSProperties}
              >
                <PipeIcon k={s.key} />
              </span>
            ))}
          </div>
          <div className="sm-flowstep-label">
            {flow[step].label}
            <span className="sm-flowstep-actor">{flow[step].actor}</span>
          </div>
          <p className="sm-flowstep-detail">{flow[step].detail}</p>
        </div>
      ) : null}
      {branch.run ? (
        <div className="sm-run">
          <span className="sm-row-tag">
            latest v{branch.run.version}
            {branch.run.date ? ` · ${branch.run.date}` : ""}
          </span>
          <p className="sm-row-blurb">{branch.run.idea}</p>
        </div>
      ) : null}
      <ol className="sm-rowlist sm-flowlist">
        {flow.map((s, i) => {
          const on = !animate || i === step;
          return (
            <li
              key={i}
              ref={(el) => {
                rowsRef.current[i] = el;
              }}
              className={`sm-row sm-row-static sm-flow-row${on ? " sm-flow-on" : ""}`}
              style={{ "--flow-tint": FLOW_TINTS[i % FLOW_TINTS.length] } as React.CSSProperties}
            >
              <div className="sm-row-head">
                <span className="sm-flow-icon">
                  <PipeIcon k={s.key} />
                </span>
                <span className="sm-row-label">{s.label}</span>
                <span className="sm-row-tag">{s.actor}</span>
              </div>
              <p className="sm-row-blurb">{s.detail}</p>
              <div className="sm-flow-token">→ {s.token}</div>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function PanelRow({
  leaf,
  selected,
  subs,
  selectedSubId,
  onSelect,
  onJump,
  labelOf,
}: {
  leaf: Leaf;
  selected: boolean;
  subs: SubLeaf[];
  selectedSubId: string | null;
  onSelect: (id: string) => void;
  onJump: (id: string) => void;
  labelOf: (id: string) => string;
}) {
  const activeSub = selectedSubId ? subs.find((s) => s.id === selectedSubId) ?? null : null;
  const hasDot = leaf.branch === "skills" || leaf.branch === "projects";
  const dotClass =
    leaf.branch === "skills"
      ? `sm-dot sm-dot-${leaf.status ?? "plain"}`
      : "sm-dot sm-dot-filled";

  return (
    <li className={`sm-row${selected ? " sm-row-on" : ""}`}>
      <button className="sm-row-btn" onClick={() => onSelect(leaf.id)}>
        <div className="sm-row-head">
          {hasDot ? <span className={dotClass} /> : null}
          <span className="sm-row-label">{leaf.label}</span>
          {leaf.tag ? <span className="sm-row-tag">{leaf.tag}</span> : null}
        </div>
        {leaf.blurb ? <p className="sm-row-blurb">{leaf.blurb}</p> : null}
      </button>

      {selected ? (
        <div className="sm-row-detail">
          {/* skills: each item is a live sub-node - tap to light it on the
              canvas and see the projects that prove it */}
          {subs.length ? (
            <>
              <div className="sm-chips">
                {subs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`sm-chip sm-chip-sub${selectedSubId === s.id ? " sm-chip-on" : ""}`}
                    onClick={() => onSelect(s.id)}
                  >
                    {s.full}
                  </button>
                ))}
              </div>
              {activeSub ? (
                <div className="sm-jumpwrap">
                  <span className="sm-jump-label">
                    {activeSub.cross.length ? "proven in" : "foundational - not tied to one build"}
                  </span>
                  {activeSub.cross.length ? (
                    <div className="sm-chips">
                      {activeSub.cross.map((id) => (
                        <button
                          key={id}
                          type="button"
                          className="sm-chip sm-chip-jump"
                          onClick={() => onJump(id)}
                        >
                          {labelOf(id)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : leaf.items?.length ? (
            <div className="sm-chips">
              {leaf.items.map((it) => (
                <span key={it} className="sm-chip">
                  {it}
                </span>
              ))}
            </div>
          ) : null}

          {/* projects: domain, metrics, architecture, full stack, link */}
          {leaf.domain ? <div className="sm-domain">{leaf.domain}</div> : null}
          {leaf.metrics?.length ? (
            <div className="sm-metrics">
              {leaf.metrics.map((m) => (
                <div key={m.label} className="sm-metric">
                  <div className="sm-metric-num">{m.value}</div>
                  <div className="sm-metric-label">{m.label}</div>
                </div>
              ))}
            </div>
          ) : null}
          {leaf.arch?.length ? (
            <div className="sm-arch">
              {leaf.arch.map((a, i) => (
                <span key={i} className="sm-arch-item">
                  <span
                    className="sm-chip"
                    style={{ borderColor: ARCH_TINT[a.kind], color: ARCH_TINT[a.kind] }}
                  >
                    {a.label}
                  </span>
                  {i < leaf.arch!.length - 1 ? <span className="sm-arrow">→</span> : null}
                </span>
              ))}
            </div>
          ) : null}
          {leaf.tags?.length ? (
            <div className="sm-chips">
              {leaf.tags.map((t) => (
                <span key={t} className="sm-chip">
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {/* resume: full bullet points */}
          {leaf.points?.length ? (
            <ul className="sm-bullets">
              {leaf.points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          ) : null}

          {/* cross-links: project <-> skill jumps */}
          {leaf.cross?.length ? (
            <div className="sm-jumpwrap">
              <span className="sm-jump-label">
                {leaf.branch === "projects" ? "skills used" : "proven in"}
              </span>
              <div className="sm-chips">
                {leaf.cross.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="sm-chip sm-chip-jump"
                    onClick={() => onJump(id)}
                  >
                    {labelOf(id)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {/* contact + project links */}
          {leaf.href ? (
            <a className="sm-linkbtn" href={leaf.href} target="_blank" rel="noreferrer">
              open {leaf.label} ↗
            </a>
          ) : null}
          {leaf.link ? (
            <a className="sm-linkbtn" href={leaf.link} target="_blank" rel="noreferrer">
              view on GitHub ↗
            </a>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

// Take-away actions for the resume: a one-click download of the controlled,
// fixed-geometry PDF, and a copy of the whole resume as clean ATS-ready text.
function ResumeActions() {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async () => {
    const text = resumeToPlainText();
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      } else {
        ok = legacyCopy(text);
      }
    } catch {
      ok = legacyCopy(text);
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }, []);

  return (
    <div className="sm-resume-actions">
      <a
        className="sm-linkbtn sm-linkbtn-solid"
        href="/Swayam_Barik_Resume.pdf"
        download="Swayam_Barik_Resume.pdf"
        aria-label="download the resume as a PDF"
      >
        Download PDF ↓
      </a>
      <button
        type="button"
        className="sm-linkbtn"
        onClick={copy}
        aria-label="copy resume as plain text"
      >
        {copied ? "Copied ✓" : "Copy as text"}
      </button>
    </div>
  );
}
