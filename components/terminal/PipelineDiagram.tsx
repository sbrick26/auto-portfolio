"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { pipelineRun } from "@/lib/pipeline";
import { SectionLabel } from "./ui";

// The `pipeline` command: an animated walk of the agent system that builds and
// ships this site, drawn as a CLOSED LOOP. A pulse of energy orbits a ring of
// agent badges (idea -> branch -> review -> green CI -> preview -> approval ->
// prod -> back to the top), lighting each one as it arrives, then keeps going
// round - because the system never stops improving the site. The run-specific
// values (idea, version, date) are real, pulled from the live changelog via
// lib/pipeline.ts.
//
// The circle is the daily build-and-ship loop. The legend beside it names each
// node and stays in sync with the pulse. The "and it runs itself" panel calls
// out the autonomous parts that drive the loop without a human in the seat: the
// daily improvement loop, the maintainer self-audit, the career check-in (where
// the archivist and resume-writer keep the resume current), and the always-on
// listener.
//
// Layout is a single column on a phone (ring on top, legend and autonomy panel
// below) and a row on a wider screen (ring left, the rest "on the side"), so it
// reads the same everywhere without a separate mobile design. Honors
// prefers-reduced-motion: every badge and arc renders lit, the pulse is hidden,
// and nothing orbits - the full loop, just static.
//
// The legend is laid out as a grid with a fixed column for the per-node token
// badge, and the badge is always rendered (its visibility toggled with opacity).
// That keeps every row's height and width constant as the pulse moves, so the
// list never reflows mid-orbit - which on a phone used to grow a row and shove
// the whole page down, then snap it back when the pulse left.

// How long the pulse rests on each node before moving to the next. Ten nodes at
// this cadence make one lap read as a deliberate orbit, not a frantic blink, and
// the loop simply repeats - no reset jump, because it is a circle.
const STEP_MS = 850;

// The ring lives in a square viewBox that scales to its container, so the whole
// diagram shrinks intact on a narrow phone instead of clipping. C is the centre,
// R the badge-ring radius, BADGE/ICON the badge box and glyph sizes (SVG units).
const VIEW = 300;
const C = 150;
const R = 112;
const BADGE = 30;
const ICON = 22;

// Position of badge i on the ring: start at the top (12 o'clock) and step
// clockwise by an even slice for each node, so the loop closes back to the top.
function pos(i: number, n: number) {
  const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
  return { x: C + R * Math.cos(a), y: C + R * Math.sin(a) };
}

// A clockwise arc connecting badge i to the next badge, wrapping the last back
// to the first so the final segment visibly closes the circle.
function arc(i: number, n: number) {
  const p = pos(i, n);
  const q = pos((i + 1) % n, n);
  return `M ${p.x} ${p.y} A ${R} ${R} 0 0 1 ${q.x} ${q.y}`;
}

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
  // scheduled: a clock - the daily loop that fires itself on a timer
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  // career check-in: a document - facts filed, the resume kept current
  doc: (
    <>
      <path d="M6.5 3h6.5l4.5 4.5V21H6.5z" />
      <path d="M13 3v4.5h4.5" />
      <path d="M9.2 13h5.6M9.2 16.3h5.6" />
    </>
  ),
};

function NodeIcon({ stageKey, size = 18 }: { stageKey: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

// The cycle glyph at the centre of the ring: two arrows chasing each other, the
// "this loops forever" mark that sits under the self-improving caption.
function CycleIcon() {
  return (
    <svg
      width={26}
      height={26}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-term-green)"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 9a7.5 7.5 0 0 1 12.9-2.9L20 9" />
      <path d="M20 4.5V9h-4.5" />
      <path d="M19.5 15a7.5 7.5 0 0 1-12.9 2.9L4 15" />
      <path d="M4 19.5V15h4.5" />
    </svg>
  );
}

// The autonomous behaviours that run the loop without a human driving - the
// parts the owner asked to surface. Icons are reused from the agent glyphs.
const AUTONOMY: { key: string; icon: string; title: string; detail: string }[] = [
  {
    key: "daily-loop",
    icon: "clock",
    title: "daily improvement loop",
    detail:
      "fires every morning unprompted: ideation scouts a change worth shipping and the loop above builds and ships it",
  },
  {
    key: "self-audit",
    icon: "reviewer",
    title: "maintainer self-audit",
    detail:
      "the reviewer watches dependencies, security, and drift, raising fixes before anything rots",
  },
  {
    key: "career-checkin",
    icon: "doc",
    title: "career check-in",
    detail:
      "interviews you, the archivist files the facts, and resume-writer refreshes the resume when warranted",
  },
  {
    key: "always-on",
    icon: "front",
    title: "always-on listener",
    detail: "between runs, your texts and screenshots become fix-now or queued work",
  },
];

export function PipelineDiagram() {
  const reduceMotion = useReducedMotion();
  const { stages, version, date, idea } = pipelineRun;
  const n = stages.length;

  // step = the node the pulse currently sits on while orbiting. Under reduced
  // motion the shown index pins to the last node so every badge and arc renders
  // lit and settled (useReducedMotion can resolve a frame late, so we derive the
  // shown index rather than seeding state from it).
  const [step, setStep] = useState(0);
  const flow = !reduceMotion;
  const active = reduceMotion ? n - 1 : step;
  // Arcs behind the pulse are lit; under reduced motion the whole ring is.
  const litArcs = reduceMotion ? n : step;

  // The orbit: advance one node, wrapping back to the top - no hold, no reset
  // jump, because a loop just keeps going. Skipped under reduced motion.
  useEffect(() => {
    if (reduceMotion) return;
    const id = setTimeout(() => setStep((s) => (s + 1) % n), STEP_MS);
    return () => clearTimeout(id);
  }, [step, reduceMotion, n]);

  const pulse = pos(active, n);

  return (
    <div className="max-w-3xl space-y-4">
      <div className="space-y-1.5">
        <SectionLabel>how this site ships itself</SectionLabel>
        <p className="text-[13px] leading-relaxed text-term-dim">
          A fleet of agents builds and deploys this portfolio on a loop. Watch a
          change orbit from idea to production and back to the top - the path it
          takes, and the values it carries, are real.
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-term-faint">
          <span className="text-term-green">latest run</span>
          <span className="text-term-cyan tabular-nums">v{version}</span>
          {date && <span className="tabular-nums">{date}</span>}
          <span className="text-term-faint">·</span>
          <span className="text-term-text/80">{idea}</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-7">
        {/* The loop: a ring of agent badges with a pulse orbiting it. Square and
            viewBox-scaled, so it shrinks intact on a phone. */}
        <div className="relative mx-auto aspect-square w-full max-w-[280px] shrink-0 md:mx-0 md:w-[280px]">
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="h-full w-full" aria-hidden>
            <circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke="var(--color-term-border)"
              strokeWidth={2}
            />
            {stages.map((s, i) =>
              i < litArcs ? (
                <path
                  key={`arc-${s.key}`}
                  d={arc(i, n)}
                  fill="none"
                  stroke={stages[(i + 1) % n].accent}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeDasharray={flow ? "4 7" : undefined}
                >
                  {flow && (
                    <animate
                      attributeName="stroke-dashoffset"
                      values="11;0"
                      dur="0.7s"
                      repeatCount="indefinite"
                    />
                  )}
                </path>
              ) : null,
            )}
            {stages.map((s, i) => {
              const p = pos(i, n);
              const lit = i <= active;
              const isActive = i === active;
              return (
                <g key={s.key}>
                  <rect
                    x={p.x - BADGE / 2}
                    y={p.y - BADGE / 2}
                    width={BADGE}
                    height={BADGE}
                    rx={9}
                    fill="var(--color-term-panel)"
                    stroke={lit ? s.accent : "var(--color-term-border)"}
                    strokeWidth={1.5}
                    style={isActive ? { filter: `drop-shadow(0 0 5px ${s.accent})` } : undefined}
                  />
                  <g
                    transform={`translate(${p.x - ICON / 2} ${p.y - ICON / 2}) scale(${ICON / 24})`}
                    fill="none"
                    stroke={lit ? s.accent : "var(--color-term-faint)"}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {ICONS[s.key]}
                  </g>
                </g>
              );
            })}
            {flow && (
              <motion.circle
                r={5}
                fill={stages[active].accent}
                initial={false}
                animate={{ cx: pulse.x, cy: pulse.y }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                <animate
                  attributeName="fill-opacity"
                  values="1;0.4;1"
                  dur="1.1s"
                  repeatCount="indefinite"
                />
              </motion.circle>
            )}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center">
            <CycleIcon />
            <span className="text-[11px] text-term-green">self-improving</span>
            <span className="text-[10px] text-term-faint">ships itself daily</span>
          </div>
        </div>

        {/* On the side: the numbered legend (in sync with the pulse) and the
            autonomous parts that drive the loop on their own. */}
        <div className="flex-1 space-y-4">
          <div className="space-y-1.5">
            <SectionLabel>the daily loop</SectionLabel>
            <ol className="space-y-2">
              {stages.map((s, i) => {
                const lit = i <= active;
                const showToken = i === active && flow;
                return (
                  <li
                    key={s.key}
                    className="grid grid-cols-[0.9rem_1fr_auto] items-baseline gap-x-2 gap-y-0.5 transition-opacity duration-300"
                    style={{ opacity: lit ? 1 : 0.5 }}
                  >
                    <span
                      className="text-right text-[11px] tabular-nums"
                      style={{ color: lit ? s.accent : "var(--color-term-faint)" }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-[13px] transition-colors duration-300"
                      style={{ color: lit ? s.accent : "var(--color-term-dim)" }}
                    >
                      {s.node}
                    </span>
                    {/* Always rendered so the column reserves its width and the
                        row keeps its height; visibility rides on opacity, so the
                        list never reflows as the pulse moves. */}
                    <span
                      className="justify-self-end rounded border px-1.5 py-px text-[10px] tabular-nums transition-opacity duration-200"
                      style={{
                        borderColor: s.accent,
                        color: s.accent,
                        opacity: showToken ? 1 : 0,
                      }}
                      aria-hidden={!showToken}
                    >
                      {s.token}
                    </span>
                    <span className="col-span-2 col-start-2 text-[12px] leading-snug text-term-faint">
                      {s.detail}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="space-y-1.5">
            <SectionLabel>and it runs itself</SectionLabel>
            <ul className="space-y-2">
              {AUTONOMY.map((a) => (
                <li key={a.key} className="flex gap-2.5">
                  <span className="mt-0.5 shrink-0 text-term-dim">
                    <NodeIcon stageKey={a.icon} size={16} />
                  </span>
                  <div className="space-y-0.5">
                    <span className="text-[13px] text-term-text/85">{a.title}</span>
                    <p className="text-[12px] leading-snug text-term-faint">{a.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
