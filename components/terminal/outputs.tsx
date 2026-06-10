"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { profile, about, skills, projects, updates, resume, changelog } from "@/content/data";
import { COMMANDS, QUICK } from "@/lib/commands";
import { APP_VERSION } from "@/lib/version";
import { TypedLine, Cursor } from "./typing";
import { Reveal, SectionLabel, CmdChip, Ext, Pill, Bar } from "./ui";

/* ----------------------------- welcome / boot ---------------------------- */

const BOOT = [
  "booting swayam.os ...",
  "mounting career-corpus ... ok",
  "starting agent pipeline ... ok",
  "ready.",
];

export function Welcome() {
  const [step, setStep] = useState(0);
  return (
    <div className="space-y-3">
      <div className="space-y-0.5 text-[13px] text-term-dim">
        {BOOT.slice(0, step + 1).map((l, idx) => (
          <div key={idx}>
            <span className="text-term-green">$</span>{" "}
            {idx === step ? (
              <TypedLine
                text={l}
                speed={12}
                onDone={() => setStep((s) => Math.min(BOOT.length - 1, s + 1))}
              />
            ) : (
              <span>{l}</span>
            )}
          </div>
        ))}
      </div>

      {step >= BOOT.length - 1 && (
        <Reveal className="space-y-3 pt-1">
          <pre className="text-term-green/90 text-[10px] leading-[1.15] sm:text-xs select-none overflow-x-auto no-scrollbar">
{String.raw` ___ _ _ _ __ _ _ _  _ __ _ _ __
(_-<| | | |/ _\ || | / _\ '  \
/__/ \_/\_|\__,_\_, | \__/_|_|_|
                |__/  barik`}
          </pre>
          <div className="text-term-text">
            Hey, I&apos;m <span className="text-term-green">{profile.name}</span>. This
            portfolio runs like a terminal.
          </div>
          <div className="text-term-dim text-[13px]">
            Type a command or tap one. Try <span className="text-term-cyan">updates</span> to
            see what I&apos;m working on, or <span className="text-term-cyan">help</span> for
            everything.
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

function TailRow({ u, onDone }: { u: (typeof updates)[number]; onDone: () => void }) {
  const line = `${u.text}`;
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3"
    >
      <span className="shrink-0 text-[12px] text-term-faint tabular-nums">
        {u.date} <span className="text-term-dim">{u.time}</span>
      </span>
      <span className="text-term-text/90">
        <TypedLine text={line} speed={9} onDone={onDone} />
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
  return (
    <div className="max-w-2xl space-y-2.5">
      <div className="flex items-center gap-2 text-[12px]">
        <motion.span
          className="inline-block h-2 w-2 rounded-full bg-term-green"
          animate={{ opacity: [1, 0.25, 1] }}
          transition={{ duration: 1.4, repeat: Infinity }}
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

export function SkillsOutput() {
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

export const RENDERERS: Record<string, () => React.ReactNode> = {
  help: () => <HelpOutput />,
  me: () => <MeOutput />,
  about: () => <AboutOutput />,
  updates: () => <UpdatesOutput />,
  skills: () => <SkillsOutput />,
  projects: () => <ProjectsOutput />,
  resume: () => <ResumeOutput />,
  contact: () => <ContactOutput />,
  changelog: () => <ChangelogOutput />,
  version: () => <VersionOutput />,
};
