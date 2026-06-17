"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { profile, about, skills, projects, updates, resume, changelog } from "@/content/data";
import { buildSkillEvidence, type SkillEvidence } from "@/lib/activity";
import { COMMANDS, QUICK } from "@/lib/commands";
import { APP_VERSION } from "@/lib/version";
import { TypedLine, Cursor, Spinner } from "./typing";
import { Reveal, SectionLabel, CmdChip, Ext, Pill, Bar } from "./ui";
import { PipelineDiagram } from "./PipelineDiagram";

/* ----------------------------- welcome / boot ---------------------------- */

// The power-on sequence tells the site's actual story (the agent pipeline that
// builds and ships it) rather than placeholder lines. Each step types in, runs a
// brief spinner, then settles to a right-aligned status token. The last step pulls
// the REAL version and self-deploy date from the changelog, so the flourish is
// also true. A settled `ok` token in term-green; the deploy line settles to the
// live version instead.
const OK = <span className="text-term-green">ok</span>;

const BOOT_STEPS: { label: string; status: React.ReactNode }[] = [
  { label: "boot swayam.os", status: OK },
  { label: "mount career-corpus", status: OK },
  { label: "spawn agent workers", status: OK },
  { label: "connect imsway.dev", status: OK },
  {
    label: "last self-deploy",
    status: (
      <span className="text-term-cyan">
        v{APP_VERSION}{" "}
        <span className="text-term-faint tabular-nums">{changelog[0]?.date}</span>
      </span>
    ),
  },
];

// How long a step's spinner runs before it settles to its status token. Kept short
// so the full five-step play (type + spin per line) lands under ~1.3s.
const SPIN_MS = 130;

// One boot line: types its label with a live cursor, shows the spinner, then
// settles to the status token and notifies the parent to advance. A step that is
// not the active one (already-resolved lines above, or every line under reduced
// motion / after a skip) mounts straight into its settled state with no animation.
function BootStep({
  label,
  status,
  active,
  onDone,
}: {
  label: string;
  status: React.ReactNode;
  active: boolean;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<"type" | "spin" | "done">(active ? "type" : "done");
  const fired = useRef(false);

  const onTyped = useCallback(() => setPhase("spin"), []);

  useEffect(() => {
    if (phase !== "spin") return;
    const id = setTimeout(() => setPhase("done"), SPIN_MS);
    return () => clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "done" && active && !fired.current) {
      fired.current = true;
      onDone();
    }
  }, [phase, active, onDone]);

  return (
    <div className="flex items-baseline gap-2">
      <span className="text-term-green">$</span>
      <span className="flex-1">
        {active && phase === "type" ? (
          <TypedLine text={label} speed={8} onDone={onTyped} />
        ) : (
          <span>{label}</span>
        )}
      </span>
      <span className="shrink-0">
        {phase === "spin" && <Spinner className="text-term-yellow" />}
        {phase === "done" && status}
      </span>
    </div>
  );
}

// The ASCII wordmark, revealed in a single left-to-right clip sweep on a natural
// play. clipPath is not a transform, so MotionConfig's reduced-motion handling
// does not strip it - we gate the sweep on `animate` ourselves (skips and reduced
// motion render it fully visible at once).
function Wordmark({ animate }: { animate: boolean }) {
  return (
    <motion.pre
      className="text-term-green/90 text-[10px] leading-[1.15] sm:text-xs select-none overflow-x-auto no-scrollbar"
      initial={animate ? { clipPath: "inset(0 100% 0 0)" } : false}
      animate={{ clipPath: "inset(0 0% 0 0)" }}
      transition={{ duration: animate ? 0.4 : 0, ease: "easeOut" }}
    >
{String.raw` ___ _ _ _ __ _ _ _  _ __ _ _ __
(_-<| | | |/ _\ || | / _\ '  \
/__/ \_/\_|\__,_\_, | \__/_|_|_|
                |__/  barik`}
    </motion.pre>
  );
}

export function Welcome() {
  const reduceMotion = useReducedMotion();
  const [skipped, setSkipped] = useState(false);
  const [step, setStep] = useState(0);

  // The sequence only animates when motion is allowed and the visitor has not
  // skipped. Once either is false, every line renders settled and the welcome
  // block shows immediately - the same instant-final-state contract the
  // typewriter already honours under reduced motion.
  const playing = !reduceMotion && !skipped;
  const bootDone = !playing || step >= BOOT_STEPS.length;

  // Skippable handoff: while the sequence plays, any keypress, click, or tap
  // completes it at once. Session focuses the active session's input on mount, so
  // the prompt already has focus - collapsing the animation hands control straight
  // to the visitor (essential for repeat visitors and recruiters in a hurry).
  useEffect(() => {
    if (!playing) return;
    const skip = () => setSkipped(true);
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, [playing]);

  const shown = bootDone ? BOOT_STEPS.length : step + 1;

  return (
    <div className="space-y-3">
      <div className="space-y-0.5 text-[13px] text-term-dim">
        {BOOT_STEPS.slice(0, shown).map((s, idx) => (
          <BootStep
            key={idx}
            label={s.label}
            status={s.status}
            active={playing && idx === step}
            onDone={() => setStep((v) => Math.min(BOOT_STEPS.length, v + 1))}
          />
        ))}
      </div>

      {bootDone && (
        <Reveal className="space-y-3 pt-1">
          <Wordmark animate={playing} />
          <div className="text-term-text">
            Hey, I&apos;m <span className="text-term-green">{profile.name}</span>. This
            portfolio runs like a terminal.
          </div>
          <div className="text-term-dim text-[13px]">
            Type a command or tap one. Try{" "}
            <span className="text-term-cyan">updates</span>{" "}
            to see what I&apos;m working on, or{" "}
            <span className="text-term-cyan">help</span> for everything.
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK.map((c) => (
              <CmdChip key={c} cmd={c} />
            ))}
            <CmdChip cmd="help" />
          </div>
        </Reveal>
      )}
    </div>
  );
}

/* --------------------------------- me ------------------------------------ */

export function MeOutput() {
  const rows: [string, React.ReactNode][] = [
    ["name", profile.name],
    ["role", profile.role],
    ["location", profile.location],
    ["status", <span className="text-term-green" key="s">● {profile.status}</span>],
    ["github", <Ext href={profile.links.github} key="g">{profile.links.github.replace("https://", "")}</Ext>],
    ["linkedin", <Ext href={profile.links.linkedin} key="l">{profile.links.linkedin.replace("https://www.", "")}</Ext>],
    ["email", <Ext href={`mailto:${profile.links.email}`} key="e">{profile.links.email}</Ext>],
  ];
  return (
    <div className="max-w-xl space-y-2.5">
      <div className="text-term-text">{profile.summary}</div>
      <div className="grid gap-x-4 gap-y-1.5 pt-1" style={{ gridTemplateColumns: "auto 1fr" }}>
        {rows.map(([k, v], i) => (
          <Reveal key={k} i={i} className="contents">
            <div className="text-term-faint">{k}</div>
            <div className="text-term-text/90">{v}</div>
          </Reveal>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <CmdChip cmd="updates" label="see updates" />
        <CmdChip cmd="projects" label="see projects" />
      </div>
    </div>
  );
}

/* -------------------------------- about ---------------------------------- */

export function AboutOutput() {
  return (
    <div className="max-w-2xl space-y-3">
      {about.map((p, i) => (
        <Reveal key={i} i={i}>
          <p className="leading-relaxed text-term-text/90">{p}</p>
        </Reveal>
      ))}
    </div>
  );
}

/* ----------------------------- updates (tail) ---------------------------- */

// Milliseconds per character for the updates feed. The log streams fast on a real
// `tail -f`, so the reveal is quick (a snappy ~200 chars/sec) - it reads as a live
// feed catching up rather than a slow typewriter, while still showing each line
// land in order.
const TAIL_SPEED = 5;

function TailRow({ u, onDone }: { u: (typeof updates)[number]; onDone: () => void }) {
  const line = `${u.text}`;
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
    >
      <span className="shrink-0 text-[12px] text-term-faint tabular-nums">
        {u.date} <span className="text-term-dim">{u.time}</span>
      </span>
      <span className="text-term-text/90">
        <TypedLine text={line} speed={TAIL_SPEED} onDone={onDone} />
        {u.tag && (
          <span className="ml-2 align-middle text-[12px] text-term-purple">#{u.tag}</span>
        )}
      </span>
    </motion.div>
  );
}

export function UpdatesOutput() {
  const [count, setCount] = useState(1);
  const allShown = count >= updates.length;
  // The pulse is an opacity loop, which MotionConfig reducedMotion="user" does
  // not suppress (it only disables transform/layout). Render a static, full
  // opacity dot when reduced motion is requested - the green dot still signals
  // 'live', only the pulsing stops.
  const reduceMotion = useReducedMotion();
  return (
    <div className="max-w-2xl space-y-2.5">
      <div className="flex items-center gap-2 text-[12px]">
        <motion.span
          className="inline-block h-2 w-2 rounded-full bg-term-green"
          animate={reduceMotion ? undefined : { opacity: [1, 0.25, 1] }}
          transition={reduceMotion ? undefined : { duration: 1.4, repeat: Infinity }}
        />
        <span className="text-term-green">live</span>
        <span className="text-term-faint">tail -f ~/work/updates.log</span>
      </div>
      <div className="space-y-1.5">
        {updates.slice(0, count).map((u, i) => (
          <TailRow
            key={i}
            u={u}
            onDone={() => setCount((c) => Math.max(c, Math.min(updates.length, i + 2)))}
          />
        ))}
      </div>
      {allShown && (
        <div className="flex items-center gap-1.5 pt-1 text-[12px] text-term-faint">
          <span>waiting for next update</span>
          <Cursor />
        </div>
      )}
    </div>
  );
}

/* -------------------------------- skills --------------------------------- */

// The evidence log for one selected skill: the actual tagged updates behind it,
// newest first. An empty category reads as "foundation, not in the daily feed"
// rather than a blank - an off week never makes a skill look abandoned.
function EvidenceList({ evidence, reduce }: { evidence: SkillEvidence; reduce: boolean }) {
  if (!evidence.items.length) {
    return (
      <div className="rounded-md border border-dashed border-term-border/70 px-3 py-4 text-[12px] leading-relaxed text-term-faint">
        no recent activity logged for{" "}
        <span style={{ color: evidence.accent }}>{evidence.category}</span> - it&apos;s
        foundational, not part of the daily feed right now. New tagged updates land
        here automatically.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {evidence.items.map((it, i) => (
        <motion.div
          key={`${it.date}-${it.time}-${i}`}
          initial={reduce ? false : { opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.2, delay: i * 0.04 }}
          className="flex gap-2.5"
        >
          <span
            className="mt-1 h-full w-[2px] shrink-0 rounded-full"
            style={{ background: evidence.accent, opacity: 0.6 }}
          />
          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <span className="shrink-0 text-[12px] text-term-faint tabular-nums">
              {it.date}
            </span>
            <span className="text-[13px] text-term-text/90">
              {it.text}
              <span className="ml-2 align-middle text-[11px] text-term-purple">
                #{it.tag}
              </span>
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Tap a skill, read the work behind it. Skill categories are chips; the selected
// one expands to its evidence pulled live from the updates feed. Defaults to the
// skill with the most recent activity so the freshest proof shows first.
export function SkillActivity() {
  const reduce = useReducedMotion();
  // Only surface skills that actually have logged evidence - a category with no
  // tagged updates yet (e.g. a foundational one not in the daily feed) is hidden
  // rather than shown as an empty chip.
  const shown = useMemo(
    () => buildSkillEvidence(updates).filter((e) => e.total > 0),
    [],
  );
  const defaultCategory = useMemo(() => {
    const active = shown.filter((e) => e.lastActive);
    if (!active.length) return shown[0]?.category ?? "";
    return active.reduce((best, e) => (e.lastActive! > best.lastActive! ? e : best))
      .category;
  }, [shown]);
  const [selected, setSelected] = useState(defaultCategory);
  const current = shown.find((e) => e.category === selected) ?? shown[0];

  return (
    <Reveal className="space-y-3 rounded-lg border border-term-border bg-term-panel2/50 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <SectionLabel>skill activity</SectionLabel>
        <span className="text-[11px] text-term-faint">
          tap a skill for the work behind it
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {shown.map((e) => {
          const on = current?.category === e.category;
          return (
            <button
              key={e.category}
              onClick={() => setSelected(e.category)}
              className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[12px] transition active:scale-[0.97]"
              style={{
                borderColor: on ? e.accent : "var(--color-term-border)",
                color: on ? e.accent : "var(--color-term-dim)",
                background: on ? "var(--color-term-panel)" : "transparent",
              }}
            >
              <span>{e.category}</span>
              <span className="tabular-nums text-term-faint">{e.total}</span>
            </button>
          );
        })}
      </div>

      {current && <EvidenceList evidence={current} reduce={!!reduce} />}
    </Reveal>
  );
}

export function SkillsOutput({ args = "" }: { args?: string } = {}) {
  // `skills --activity` (alias `-a`) swaps the static bars/radar for the
  // tap-a-skill evidence view; bare `skills` keeps the established view clean.
  if (/(?:^|\s)(?:--activity|-a)(?:\s|$)/.test(args)) {
    return (
      <div className="space-y-4">
        <SkillActivity />
        <div className="flex flex-wrap items-center gap-2 text-[12px] text-term-faint">
          <span>each skill, backed by the actual work from the live updates feed</span>
          <CmdChip cmd="skills" label="full skills" />
        </div>
      </div>
    );
  }

  const radarData = skills.map((g) => ({
    category: g.category.split(" ")[0],
    value: Math.round(g.items.reduce((s, x) => s + x.level, 0) / g.items.length),
  }));

  return (
    <div className="space-y-5">
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        {skills.map((g, gi) => (
          <Reveal key={g.category} i={gi} className="space-y-2">
            <SectionLabel>{g.category}</SectionLabel>
            <div className="space-y-2">
              {g.items.map((s, si) => (
                <div key={s.name} className="space-y-1">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-term-text/90">{s.name}</span>
                    <span className="text-term-faint tabular-nums">{s.level}</span>
                  </div>
                  <Bar value={s.level} accent={g.accent} delay={gi * 0.08 + si * 0.05} />
                </div>
              ))}
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal i={4} className="rounded-lg border border-term-border bg-term-panel2/50 p-3">
        <SectionLabel>category overview</SectionLabel>
        <div className="h-[210px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="#323848" />
              <PolarAngleAxis
                dataKey="category"
                tick={{ fill: "#a3acbc", fontSize: 11 }}
              />
              <Radar
                dataKey="value"
                stroke="var(--color-term-green)"
                fill="var(--color-term-green)"
                fillOpacity={0.18}
                isAnimationActive
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Reveal>

      <Reveal i={5} className="flex flex-wrap items-center gap-2 text-[12px] text-term-faint">
        <span>see the work behind each skill</span>
        <CmdChip cmd="skills --activity" label="skill activity" />
      </Reveal>
    </div>
  );
}

/* ------------------------------- projects -------------------------------- */

const statusColor: Record<string, string> = {
  live: "text-term-green",
  building: "text-term-yellow",
  shipped: "text-term-cyan",
  archived: "text-term-faint",
};

export function ProjectsOutput() {
  return (
    <div className="grid max-w-3xl gap-3 sm:grid-cols-2">
      {projects.map((p, i) => (
        <Reveal key={p.name} i={i}>
          <div className="h-full rounded-lg border border-term-border bg-term-panel2/50 p-3.5 transition hover:border-term-green/40">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-term-text">{p.name}</span>
              <span className={`text-[11px] ${statusColor[p.status]}`}>● {p.status}</span>
            </div>
            <p className="mb-2.5 text-[13px] leading-relaxed text-term-dim">{p.blurb}</p>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {p.stack.map((s) => (
                <Pill key={s}>{s}</Pill>
              ))}
            </div>
            {p.link && (
              <Ext href={p.link}>
                open <span className="text-term-faint">-&gt;</span>
              </Ext>
            )}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

/* -------------------------------- resume --------------------------------- */

export function ResumeOutput() {
  return (
    <div className="max-w-2xl space-y-4">
      <Reveal>
        <SectionLabel>summary</SectionLabel>
        <p className="leading-relaxed text-term-text/90">{resume.summary}</p>
      </Reveal>
      <Reveal i={1}>
        <SectionLabel>experience</SectionLabel>
        <div className="space-y-3">
          {resume.experience.map((e, i) => (
            <div key={i}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-term-text">{e.title}</span>
                <span className="text-[12px] text-term-faint">{e.when}</span>
              </div>
              {e.org && <div className="text-[13px] text-term-cyan">{e.org}</div>}
              <ul className="mt-1 space-y-1">
                {e.points.map((pt, j) => (
                  <li key={j} className="flex gap-2 text-[13px] text-term-dim">
                    <span className="text-term-green">-</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal i={2}>
        <SectionLabel>skills</SectionLabel>
        <div className="space-y-1">
          {skills.map((g) => (
            <div key={g.category} className="text-[13px]">
              <span className="text-term-faint">{g.category}: </span>
              <span className="text-term-text/90">{g.items.map((s) => s.name).join(", ")}</span>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal i={3}>
        <SectionLabel>education</SectionLabel>
        {resume.education.map((e, i) => (
          <div key={i}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-term-text">{e.title}</span>
              <span className="text-[12px] text-term-faint">{e.when}</span>
            </div>
            {e.org && <div className="text-[13px] text-term-cyan">{e.org}</div>}
          </div>
        ))}
      </Reveal>
    </div>
  );
}

/* ------------------------------- contact --------------------------------- */

export function ContactOutput() {
  return (
    <div className="space-y-1.5">
      <div>
        <span className="text-term-faint">email </span>
        <Ext href={`mailto:${profile.links.email}`}>{profile.links.email}</Ext>
      </div>
      <div>
        <span className="text-term-faint">github </span>
        <Ext href={profile.links.github}>{profile.links.github.replace("https://", "")}</Ext>
      </div>
      <div>
        <span className="text-term-faint">linkedin </span>
        <Ext href={profile.links.linkedin}>{profile.links.linkedin.replace("https://www.", "")}</Ext>
      </div>
    </div>
  );
}

/* --------------------------------- help ---------------------------------- */

export function HelpOutput() {
  return (
    <div className="max-w-xl space-y-3">
      <div className="grid gap-x-6 gap-y-1.5" style={{ gridTemplateColumns: "auto 1fr" }}>
        {COMMANDS.filter((c) => !c.hidden).map((c) => (
          <div key={c.name} className="contents">
            <CmdChip cmd={c.name} />
            <span className="self-center text-[13px] text-term-dim">{c.description}</span>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-term-border pt-3 text-[12px] text-term-faint">
        <div>• click any command above, or type it and hit enter</div>
        <div>• ↑ / ↓ for history, tab to autocomplete</div>
        <div>• ⌘K / ctrl+K for the command palette, + for a new tab</div>
      </div>
    </div>
  );
}

/* ------------------------------- changelog ------------------------------- */

export function ChangelogOutput() {
  return (
    <div className="max-w-2xl space-y-4">
      {changelog.map((e, i) => (
        <Reveal key={e.version} i={i}>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className={i === 0 ? "text-term-green" : "text-term-cyan"}>
              v{e.version}
            </span>
            <span className="text-[12px] text-term-faint tabular-nums">{e.date}</span>
            {i === 0 && (
              <span className="rounded border border-term-green/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-term-green">
                current
              </span>
            )}
          </div>
          <ul className="mt-1 space-y-1">
            {e.changes.map((c, j) => (
              <li key={j} className="flex gap-2 text-[13px] text-term-dim">
                <span className="text-term-green">+</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      ))}
    </div>
  );
}

/* -------------------------------- version -------------------------------- */

export function VersionOutput() {
  return (
    <div className="space-y-2 text-[13px]">
      <div>
        <span className="text-term-text">auto-portfolio</span>{" "}
        <span className="text-term-green">v{APP_VERSION}</span>
      </div>
      <div className="text-term-dim">
        channel <span className="text-term-cyan">production</span> · imsway.dev
      </div>
      <div className="space-y-0.5 text-[12px] text-term-faint">
        <div>minor versions ship themselves through the agent pipeline</div>
        <div>major versions are milestone drops</div>
      </div>
      <div className="pt-1 text-[12px] text-term-purple">
        you found the secret command. nice.
      </div>
    </div>
  );
}

/* --------------------------------- error --------------------------------- */

export function ErrorOutput({ input }: { input: string }) {
  const cmd = input.trim().split(/\s+/)[0];
  return (
    <div className="text-[13px]">
      <span className="text-term-red">command not found: {cmd}</span>
      <span className="text-term-faint"> — try </span>
      <CmdChip cmd="help" />
    </div>
  );
}

/* ------------------------------- registry -------------------------------- */

export const RENDERERS: Record<string, (args?: string) => React.ReactNode> = {
  help: () => <HelpOutput />,
  me: () => <MeOutput />,
  about: () => <AboutOutput />,
  updates: () => <UpdatesOutput />,
  skills: (args) => <SkillsOutput args={args} />,
  projects: () => <ProjectsOutput />,
  resume: () => <ResumeOutput />,
  contact: () => <ContactOutput />,
  changelog: () => <ChangelogOutput />,
  pipeline: () => <PipelineDiagram />,
  version: () => <VersionOutput />,
};
