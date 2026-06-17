"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { pipelineRun, type PipelineStage } from "@/lib/pipeline";
import { SectionLabel } from "./ui";

// The `pipeline` command: an animated walk of the agent system that builds and
// ships this site. A pulse of energy travels a weaving conduit (idea -> branch
// -> review -> green CI -> preview -> approval -> prod), lighting each agent's
// icon badge as it arrives, then loops. The values are real - the idea, version,
// and date come from the live changelog via lib/pipeline.ts.
//
// The shape is deliberately not a straight line: the badges zigzag down a
// serpentine path and the energy visibly flows along it, so the fleet reads as a
// living system rather than a static chart. Each agent carries its own glyph.
//
// Honors prefers-reduced-motion: every badge renders lit, the conduit is filled,
// and nothing loops or flows - the full diagram, just static. The layout stays a
// single vertical column (icon badges left, node cards right), so it reads the
// same on a phone as on a wide screen without a separate mobile design.

// How long the pulse rests on each node before moving on, and how long it holds
// at the end before the run replays. Tuned so the full ten-node play reads as a
// deliberate walk, not a frantic blink.
const STEP_MS = 900;
const HOLD_MS = 2200;

// The badge band is BAND px wide; badges zigzag around its center (CX) by +/-AMP
// so the conduit weaving between them reads as an organic flow, not a rail. BAND
// is sized so a 36px badge offset by AMP still clears both gutter edges with a
// couple px to spare (28 +/- 9 +/- 18 stays inside [0, 56]) - no clipping on a
// narrow phone viewport. CX stays BAND/2 so the woven conduit reads centered.
const BAND = 56;
const CX = 28;
const AMP = 9;

// A unique line glyph per agent, drawn in a shared 24x24 box and tinted by the
// node's accent. Each one nods at what that agent actually does in the run.
const ICONS: Record<string, React.ReactNode> = {
  // owner: a person - you, over Telegram
  owner: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c0-3.6 3.4-5.6 7.5-5.6s7.5 2 7.5 5.6" />
    </>
  ),
  // front agent: a hub routing work out to three spokes
  front: (
    <>
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="5" cy="6" r="1.8" />
      <circle cx="19" cy="6" r="1.8" />
      <circle cx="12" cy="20" r="1.8" />
      <path d="M10.4 10.4 6.3 7.4M13.6 10.4 17.7 7.4M12 14.4V18.2" />
    </>
  ),
  // portfolio lead: a flag - holds the guardrails, plants the scope
  lead: (
    <>
      <path d="M5.5 21V3.5" />
      <path d="M5.5 4h11l-2.2 3.8 2.2 3.8h-11" />
    </>
  ),
  // ideation: a lightbulb
  ideation: (
    <>
      <path d="M9.2 17.5h5.6" />
      <path d="M10 20.5h4" />
      <path d="M12 3.2a5.8 5.8 0 0 0-3.8 10.1c.8.8 1 1.4 1 3h5.6c0-1.6.2-2.2 1-3A5.8 5.8 0 0 0 12 3.2z" />
    </>
  ),
  // build: a package / cube being assembled on a branch
  build: (
    <>
      <path d="M12 3.2 4.4 7.3v8.4L12 20l7.6-4.3V7.3z" />
      <path d="M4.4 7.3 12 11.6l7.6-4.3M12 11.6V20" />
    </>
  ),
  // reviewer: a shield with a check - judges APPROVE / REQUEST_CHANGES
  reviewer: (
    <>
      <path d="M12 3.2l7 2.8v5c0 4.8-3 7.6-7 8.8-4-1.2-7-4-7-8.8V6z" />
      <path d="M8.8 12l2.2 2.2 4.2-4.4" />
    </>
  ),
  // GitHub CI: a git branch with a merge back to the line
  ci: (
    <>
      <circle cx="6.5" cy="6" r="2.2" />
      <circle cx="6.5" cy="18" r="2.2" />
      <circle cx="17.5" cy="9" r="2.2" />
      <path d="M6.5 8.2v7.6" />
      <path d="M17.5 11.2c0 4-5.2 1.8-5.2 5.6" />
    </>
  ),
  // branch preview: an eye - a deploy to inspect before prod
  preview: (
    <>
      <path d="M2.5 12s3.6-6.6 9.5-6.6S21.5 12 21.5 12s-3.6 6.6-9.5 6.6S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  // your approval: a thumbs-up - the final human gate, one tap
  approval: (
    <>
      <path d="M7 11v8.5H3.5V11z" />
      <path d="M7 11l3.6-6.8c1.4 0 2.4 1 2.4 2.4V9h5.3c1 0 1.7 1 1.5 1.9l-1.2 5.6c-.2 1-1 1.6-2 1.6H7" />
    </>
  ),
  // AWS / imsway.dev: a cloud with an upload arrow - shipped to prod
  deploy: (
    <>
      <path d="M7 18a3.8 3.8 0 0 1 .2-7.6 5 5 0 0 1 9.5-1.4A3.4 3.4 0 0 1 17.6 18z" />
      <path d="M12 12.5v5.5" />
      <path d="M9.7 14.6 12 12.3l2.3 2.3" />
    </>
  ),
};

function NodeIcon({ stageKey }: { stageKey: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[stageKey]}
    </svg>
  );
}

// The icon badge that sits on the conduit. Idle is dim; lit (active/done) takes
// the node's accent; active gets a soft glow and a gentle breathing scale. `dx`
// offsets the badge horizontally to draw the zigzag (composed with the scale via
// framer's own x/scale so neither clobbers the other).
function Badge({
  stage,
  state,
  dx,
  animate,
}: {
  stage: PipelineStage;
  state: "idle" | "active" | "done";
  dx: number;
  animate: boolean;
}) {
  const lit = state !== "idle";
  const isActive = state === "active";
  return (
    <motion.div
      className="flex h-9 w-9 items-center justify-center rounded-xl border transition-colors duration-300"
      style={{
        x: dx,
        borderColor: lit ? stage.accent : "var(--color-term-border)",
        background: "var(--color-term-panel)",
        color: lit ? stage.accent : "var(--color-term-faint)",
        boxShadow: isActive ? `0 0 14px -2px ${stage.accent}` : "none",
      }}
      animate={isActive && animate ? { scale: [1, 1.09, 1] } : { scale: 1 }}
      transition={
        isActive && animate
          ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.3 }
      }
    >
      <NodeIcon stageKey={stage.key} />
    </motion.div>
  );
}

function NodeCard({
  stage,
  state,
}: {
  stage: PipelineStage;
  state: "idle" | "active" | "done";
}) {
  const lit = state !== "idle";
  return (
    <div
      className="flex flex-col justify-center gap-0.5 py-1.5 transition-opacity duration-300"
      style={{ opacity: lit ? 1 : 0.4 }}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span
          className="text-[13px] transition-colors duration-300"
          style={{ color: lit ? stage.accent : "var(--color-term-dim)" }}
        >
          {stage.node}
        </span>
        {/* The artifact the pulse carries onward - revealed once it has passed. */}
        <motion.span
          className="rounded border px-1.5 py-px text-[11px] tabular-nums"
          style={{ borderColor: stage.accent, color: stage.accent }}
          initial={false}
          animate={{ opacity: lit ? 1 : 0, scale: state === "active" ? 1 : 0.96 }}
          transition={{ duration: 0.25 }}
        >
          {stage.token}
        </motion.span>
      </div>
      <span className="text-[12px] leading-snug text-term-faint">{stage.detail}</span>
    </div>
  );
}

export function PipelineDiagram() {
  const reduceMotion = useReducedMotion();
  const { stages, version, date, idea } = pipelineRun;
  const last = stages.length - 1;

  // step = the node the pulse currently sits on while playing. Under reduced
  // motion the displayed `active` pins to the end so everything renders lit and
  // settled with no animation (useReducedMotion can resolve a frame late, so we
  // derive the shown index rather than seeding state from it).
  const [step, setStep] = useState(0);
  const active = reduceMotion ? last : step;
  const flow = !reduceMotion;

  // Measured vertical center of each badge row (relative to the column wrapper),
  // so the weaving conduit and the traveling pulse track real layout - robust to
  // card text that wraps to two lines on a narrow screen.
  const wrapRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [centers, setCenters] = useState<number[]>([]);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const next = rowRefs.current.map((el) =>
        el ? el.offsetTop + el.offsetHeight / 2 : 0,
      );
      setCenters(next);
      setHeight(wrap.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // The run loop: step the pulse down one node at a time, hold at the bottom,
  // then replay. Skipped entirely under reduced motion (active stays pinned).
  useEffect(() => {
    if (reduceMotion) return;
    const wait = step >= last ? HOLD_MS : STEP_MS;
    const id = setTimeout(() => {
      setStep((a) => (a >= last ? 0 : a + 1));
    }, wait);
    return () => clearTimeout(id);
  }, [step, last, reduceMotion]);

  const measured = centers.length === stages.length && height > 0;
  // Horizontal anchor of each badge - alternating sides of the band center.
  const xAt = (i: number) => CX + (i % 2 ? AMP : -AMP);

  // A smooth S-curve connector between two consecutive badges, weaving via
  // vertical control points at their respective x. Returns an SVG path string.
  const segPath = (i: number) => {
    const x0 = xAt(i);
    const x1 = xAt(i + 1);
    const y0 = centers[i];
    const y1 = centers[i + 1];
    const dy = (y1 - y0) * 0.5;
    return `M ${x0} ${y0} C ${x0} ${y0 + dy}, ${x1} ${y1 - dy}, ${x1} ${y1}`;
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <SectionLabel>how this site ships itself</SectionLabel>
        <p className="text-[13px] leading-relaxed text-term-dim">
          A fleet of agents builds and deploys this portfolio daily. Watch a change
          flow from idea to production - the path it takes, and the values it
          carries, are real.
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-term-faint">
          <span className="text-term-green">latest run</span>
          <span className="text-term-cyan tabular-nums">v{version}</span>
          {date && <span className="tabular-nums">{date}</span>}
          <span className="text-term-faint">·</span>
          <span className="text-term-text/80">{idea}</span>
        </div>
      </div>

      <div ref={wrapRef} className="relative">
        {/* The conduit: a dim weaving track, the energized segments the pulse has
            already crossed (flowing dashes), and the glowing pulse itself riding
            the leading edge. Sits behind the badges. */}
        <svg
          className="pointer-events-none absolute left-0 top-0 z-0"
          width={BAND}
          height={height || undefined}
          aria-hidden
        >
          {measured && (
            <>
              {stages.slice(0, last).map((s, i) => (
                <path
                  key={`base-${s.key}`}
                  d={segPath(i)}
                  fill="none"
                  stroke="var(--color-term-border)"
                  strokeWidth={2}
                />
              ))}
              {stages.slice(0, last).map((s, i) =>
                active > i ? (
                  <path
                    key={`lit-${s.key}`}
                    d={segPath(i)}
                    fill="none"
                    stroke={stages[i + 1].accent}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeDasharray={flow ? "5 7" : undefined}
                  >
                    {flow && (
                      <animate
                        attributeName="stroke-dashoffset"
                        values="12;0"
                        dur="0.7s"
                        repeatCount="indefinite"
                      />
                    )}
                  </path>
                ) : null,
              )}
              {flow && (
                <motion.circle
                  r={5}
                  fill={stages[active].accent}
                  initial={false}
                  animate={{ cx: xAt(active), cy: centers[active] }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                >
                  <animate
                    attributeName="fill-opacity"
                    values="1;0.35;1"
                    dur="1.1s"
                    repeatCount="indefinite"
                  />
                </motion.circle>
              )}
            </>
          )}
        </svg>

        <div className="space-y-1">
          {stages.map((s, i) => {
            const state = i === active ? "active" : i < active ? "done" : "idle";
            return (
              <div
                key={s.key}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className="flex items-stretch gap-3"
              >
                <div className="relative z-10 flex shrink-0 items-center justify-center" style={{ width: BAND }}>
                  <Badge stage={s} state={state} dx={xAt(i) - CX} animate={flow} />
                </div>
                <NodeCard stage={s} state={state} />
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[12px] leading-relaxed text-term-faint">
        Three levels, hard ceiling: owner -&gt; front agent -&gt; project lead -&gt;
        workers. Trivial polish auto-merges on green; anything user-visible waits for
        the one-tap approval.
      </p>
    </div>
  );
}
