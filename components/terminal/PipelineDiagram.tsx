"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { pipelineRun, type PipelineStage } from "@/lib/pipeline";
import { SectionLabel } from "./ui";

// The `pipeline` command: an animated walk of the agent system that builds and
// ships this site. A token pulses down the path the same way a real daily run
// moves (idea -> branch -> review -> green CI -> preview -> approval -> prod),
// lighting each node as it arrives, then loops. The values are real - the idea,
// version, and date come from the live changelog via lib/pipeline.ts.
//
// Honors prefers-reduced-motion: every node renders lit, the rail is filled, and
// nothing loops - the full diagram, just static. The layout is a single vertical
// column (the rail down the left, node cards to the right), so it reads the same
// on a phone as on a wide screen without a separate mobile design.

// How long the pulse rests on each node before moving on, and how long it holds
// at the end before the run replays. Tuned so the full ten-node play reads as a
// deliberate walk, not a frantic blink.
const STEP_MS = 900;
const HOLD_MS = 2200;

const RAIL_X = 11; // center of the rail glyphs, in the gutter's local px

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
      className="flex flex-col gap-0.5 py-1.5 transition-opacity duration-300"
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

  // Measured vertical center of each node row (relative to the column wrapper),
  // so the rail fill and the traveling token track real layout - robust to text
  // that wraps to two lines on a narrow screen.
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

  const topY = centers[0] ?? 0;
  const activeY = centers[active] ?? 0;
  const bottomY = centers[last] ?? height;
  const measured = centers.length === stages.length && height > 0;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="space-y-1.5">
        <SectionLabel>how this site ships itself</SectionLabel>
        <p className="text-[13px] leading-relaxed text-term-dim">
          A fleet of agents builds and deploys this portfolio daily. Watch one run
          move a change from idea to production - the path, and the values, are
          real.
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-term-faint">
          <span className="text-term-green">latest run</span>
          <span className="text-term-cyan tabular-nums">v{version}</span>
          {date && <span className="tabular-nums">{date}</span>}
          <span className="text-term-faint">·</span>
          <span className="text-term-text/80">{idea}</span>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative grid gap-x-3"
        style={{ gridTemplateColumns: "22px 1fr" }}
      >
        {/* The rail: a dim track, a colored fill that grows to the active node,
            the node glyphs, and the pulse riding the fill's leading edge. */}
        <svg
          className="pointer-events-none absolute left-0 top-0"
          width={22}
          height={height || undefined}
          aria-hidden
        >
          {measured && (
            <>
              <line
                x1={RAIL_X}
                x2={RAIL_X}
                y1={topY}
                y2={bottomY}
                stroke="var(--color-term-border)"
                strokeWidth={2}
              />
              <motion.line
                x1={RAIL_X}
                x2={RAIL_X}
                y1={topY}
                stroke="var(--color-term-green)"
                strokeWidth={2}
                strokeOpacity={0.7}
                initial={false}
                animate={{ y2: reduceMotion ? bottomY : activeY }}
                transition={{ duration: reduceMotion ? 0 : 0.45, ease: "easeInOut" }}
              />
              {stages.map((s, i) => {
                const lit = i <= active;
                return (
                  <circle
                    key={s.key}
                    cx={RAIL_X}
                    cy={centers[i]}
                    r={3.5}
                    fill={lit ? s.accent : "var(--color-term-panel)"}
                    stroke={lit ? s.accent : "var(--color-term-border)"}
                    strokeWidth={1.5}
                    style={{ transition: "fill 0.3s, stroke 0.3s" }}
                  />
                );
              })}
              {!reduceMotion && (
                <motion.circle
                  cx={RAIL_X}
                  r={5}
                  fill={stages[active].accent}
                  initial={false}
                  animate={{ cy: activeY }}
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

        {/* Spacer column under the rail; node cards in the content column. */}
        <div aria-hidden />
        <div className="min-w-0">
          {stages.map((s, i) => (
            <div
              key={s.key}
              ref={(el) => {
                rowRefs.current[i] = el;
              }}
            >
              <NodeCard
                stage={s}
                state={i === active ? "active" : i < active ? "done" : "idle"}
              />
            </div>
          ))}
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
