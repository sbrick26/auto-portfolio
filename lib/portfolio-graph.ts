// portfolio-graph.ts - builds the branch/leaf model for the skill-tree homepage
// FRESH from content/data.ts. Pure + deterministic: same content -> same graph,
// so the layout is stable and unit-testable. The render layer (deterministic
// grid-tree positions + idle float + pan/zoom) lives in components/skillmap/.
//
// Design: "Warm Paper Grid Tree" (handoff option 3a). A center card, eight branch
// nodes on a fixed grid, leaf nodes fanning out from each branch, a slide-in
// detail panel. Single teal accent, no force simulation.

import {
  profile,
  about,
  skills,
  projects,
  changelog,
  resume,
  updates,
  type Project,
} from "@/content/data";
import { buildPipelineRun } from "@/lib/pipeline";

export type BranchId =
  | "about"
  | "skills"
  | "resume"
  | "updates"
  | "changelog"
  | "projects"
  | "pipeline"
  | "contact";
export type LeafStatus = "done" | "active" | "next";

/** A leaf (sub-item) hanging off a branch. The circle itself is the marker. */
export interface Leaf {
  id: string;
  branch: BranchId;
  label: string;
  blurb: string;
  /** skills coloring: done/active = solid teal, next = hollow. undefined = neutral */
  status?: LeafStatus;
  /** projects read as "shipped" - a solid teal leaf with no status word */
  filled?: boolean;
  /** small trailing tag in the panel row (resume era, or skill status word) */
  tag?: string;
  /** project stack chips, each a jump to the skill it proves */
  tags?: string[];
  /** leaf ids this node jumps to (project <-> skill) */
  cross?: string[];
  /** secondary skills/items shown under a skills row */
  items?: string[];
  href?: string;
  // project-only panel extras
  domain?: string;
  metrics?: { value: string; label: string }[];
  arch?: { label: string; kind: string }[];
  link?: string;
  // resume-only panel extras
  role?: string;
  org?: string;
  points?: string[];
}

/** One of the six fixed branches radiating from the center card. */
export interface Branch {
  id: BranchId;
  label: string;
  /** Newsreader title shown in the panel header (may differ from the node label) */
  title: string;
  /** one or two sentence panel lead */
  lead: string;
  /** -1 = above the card, +1 = below */
  dir: -1 | 1;
  /** fixed world x for the branch column */
  x: number;
  /** |world y| of the pill from the card midline (world y = dir * y) */
  y: number;
  /** the section's accent color (tile, leaves, connectors, panel) */
  color: string;
  /** leaf nodes drawn on the canvas (empty = panel-only branch, e.g. changelog) */
  leaves: Leaf[];
  /** panel-only rows for branches that intentionally have no canvas leaves */
  versions?: { version: string; date: string; changes: string[] }[];
  /** panel-only live feed rows (updates branch), newest first */
  feed?: { date: string; time?: string; text: string; tag?: string }[];
  /** panel-only lifecycle steps (pipeline branch), in run order */
  flow?: { key: string; label: string; detail: string; token: string; actor: string }[];
  /** run-specific facts for the pipeline branch header (latest self-deploy) */
  run?: { version: string; date: string; idea: string };
}

/** A second-layer node: one concrete skill inside a skill-group leaf, cross-
 * linked to the projects whose stacks prove it. Fully data-driven: add an item
 * to a group in content/data.ts and it lands on the canvas automatically. */
export interface SubLeaf {
  id: string;
  /** parent leaf id (a skills-group leaf) */
  parent: string;
  /** short canvas caption */
  label: string;
  /** the full skill name (panel chip) */
  full: string;
  /** project leaf ids whose stack mentions this skill */
  cross: string[];
}

export interface PanelMe {
  name: string;
  role: string;
  summary: string;
  initials: string;
  location: string;
  links: { label: string; href: string }[];
  /** demo video cuts; the panel button picks by screen width */
  demo: { horizontal: string; vertical: string };
}

export interface PortfolioGraph {
  me: PanelMe;
  branches: Branch[];
  branchById: Record<BranchId, Branch>;
  leafById: Record<string, Leaf>;
  /** parent branch id for any leaf OR sub-leaf id - panel + highlight resolution */
  branchOfLeaf: Record<string, BranchId>;
  /** second-layer skill web, keyed by the owning skills-group leaf */
  subLeavesByParent: Record<string, SubLeaf[]>;
  subLeafById: Record<string, SubLeaf>;
}

// Fixed grid positions (handoff "Layout" table, grown to eight). Up branches
// above the card, down branches below, four per row, arranged as an ARC: the
// edge tiles pull in horizontally and push out vertically, so the map hugs
// screen proportions. The leafy branches (Skills, Projects) sit nearest the
// center spine so their fans have room; panel-only branches (Updates,
// Changelog, Pipeline) ride the corners.
const BRANCH_POS: Record<BranchId, { dir: -1 | 1; x: number; y: number }> = {
  about: { dir: -1, x: -330, y: 205 },
  skills: { dir: -1, x: -140, y: 150 },
  resume: { dir: -1, x: 140, y: 150 },
  updates: { dir: -1, x: 330, y: 205 },
  changelog: { dir: 1, x: -330, y: 205 },
  projects: { dir: 1, x: -140, y: 150 },
  pipeline: { dir: 1, x: 140, y: 150 },
  contact: { dir: 1, x: 330, y: 205 },
};

// One muted, paper-friendly accent per section. Skills keeps the signature
// teal; the rest sit in the same low-saturation register so the map reads as
// one system, just color-coded.
const BRANCH_COLOR: Record<BranchId, string> = {
  about: "#8c6f93",
  skills: "#127c70",
  resume: "#667fa5",
  updates: "#b5853c",
  changelog: "#c1715a",
  projects: "#5f8b63",
  pipeline: "#4e7e94",
  contact: "#a8677d",
};

// Position + palette for one branch, spread into its definition.
const posOf = (id: BranchId) => ({ ...BRANCH_POS[id], color: BRANCH_COLOR[id] });

// Short, scannable leaf labels for the about notes (kept in content order).
const ABOUT_TITLES = ["IBM / today", "before IBM", "this site", "the pipeline"];

// Display label + honest status for each skill category. The category key is kept
// for cross-link resolution; only the label/status are presentation.
const SKILL_META: Record<string, { label: string; status: LeafStatus; blurb: string }> = {
  "ai / agents": {
    label: "AI & Agents",
    status: "active",
    blurb: "watsonx Orchestrate, MCP servers, agent SDKs, evals, and the guardrails that ship them. The deepening focus.",
  },
  "customer-facing": {
    label: "Solutions",
    status: "done",
    blurb: "POC design to deployment ownership, scoping, stakeholder buy-in, and competitive displacement.",
  },
  "languages + core": {
    label: "Core Stack",
    status: "done",
    blurb: "Python, SQL / Db2, TypeScript, and Swift - the production languages under everything.",
  },
  "cloud + data": {
    label: "Cloud & Data",
    status: "next",
    blurb: "AWS, OAuth / OpenAPI, Microsoft Graph, Workday / ServiceNow, Docker - growing into scale.",
  },
};

// Short node labels per project, BY INDEX into content/data.ts `projects`. This
// is the ONLY hand-touch when content grows: add a project to data.ts and it
// auto-appears as a leaf (and a panel row) via the deterministic fan; this map
// just gives it a tidy node caption. Anything without an entry falls back to
// `deriveShort(name)`, so a new project still renders with zero edits here.
const PROJECT_SHORT: Record<number, string> = {
  0: "Agent Pipeline",
  1: "RPG → MCP",
  2: "BMS → React",
  3: "Sterling MCP",
  4: "Agentic HR",
  5: "AIDLC Guard",
  6: "Agent Bake-off",
  7: "Agent Council",
  8: "Email Triage",
  9: "Data Cleanse",
};

// Cheap, safe fallback caption: text before the first separator, first few words.
function deriveShort(name: string): string {
  const head = name.split(/[(–—\-:]/)[0].trim();
  const words = head.split(/\s+/).slice(0, 3).join(" ");
  return words.length > 22 ? words.slice(0, 21).trimEnd() + "…" : words;
}

// Sub-leaf caption: first segment of the full skill name, kept node-sized.
function subShort(name: string): string {
  const head = name.split(/[(/+]/)[0].trim();
  return head.length > 20 ? head.slice(0, 19).trimEnd() + "…" : head;
}

// A project's stack token proves a skill item when either mentions the other
// (case-insensitive), so "SQL / Db2" matches the "Db2" token and "MCP servers"
// matches "MCP". Loose on purpose: new items/projects link up automatically.
function itemMatchesToken(item: string, token: string): boolean {
  const a = item.toLowerCase();
  const b = token.toLowerCase();
  if (b.length < 3 || a.length < 3) return a === b;
  return a.includes(b) || b.includes(a);
}

// Which skill CATEGORY a project's stack token proves. Owns its own taxonomy on
// purpose (not imported) so the map is self-contained.
const TOKEN_CATEGORY: Record<string, string> = {
  "Next.js": "languages + core",
  React: "languages + core",
  TypeScript: "languages + core",
  "Node.js": "languages + core",
  Python: "languages + core",
  FastAPI: "languages + core",
  Flask: "languages + core",
  SSE: "languages + core",
  uv: "languages + core",
  "IBM i / RPG": "languages + core",
  "Java / Liberty": "languages + core",
  Db2: "languages + core",
  SQLite: "languages + core",
  Informix: "languages + core",
  MCP: "ai / agents",
  "watsonx Orchestrate": "ai / agents",
  "Claude Code": "ai / agents",
  AIDLC: "ai / agents",
  "policy-as-code": "ai / agents",
  "NIST / FedRAMP": "ai / agents",
  semgrep: "ai / agents",
  pytest: "ai / agents",
  "AI coding agent": "ai / agents",
  AWS: "cloud + data",
  SST: "cloud + data",
  Docker: "cloud + data",
  SSH: "cloud + data",
  "SSH ControlMaster": "cloud + data",
  "OAuth 2.0": "cloud + data",
  OpenAPI: "cloud + data",
  "Microsoft Graph": "cloud + data",
  Workday: "cloud + data",
  ServiceNow: "cloud + data",
  "Sterling OMS": "cloud + data",
  "IBM Z": "cloud + data",
  "CICS / BMS": "cloud + data",
  "LucidLink SDK": "cloud + data",
  "CI gate": "cloud + data",
};

function categoriesForProject(p: Project): string[] {
  const seen = new Set<string>();
  for (const t of p.stack) {
    const c = TOKEN_CATEGORY[t];
    if (c) seen.add(c);
  }
  return [...seen];
}

const skillIdByCategory = (category: string): string => {
  const i = skills.findIndex((g) => g.category === category);
  return i >= 0 ? `skill-${i}` : "";
};

export function buildPortfolioGraph(): PortfolioGraph {
  // ---- About: each note becomes a neutral leaf ----
  const aboutLeaves: Leaf[] = about.map((body, i) => ({
    id: `about-${i}`,
    branch: "about",
    label: ABOUT_TITLES[i] ?? `note ${i + 1}`,
    blurb: body,
  }));

  // ---- Skills: each category becomes a status-colored leaf ----
  const skillLeaves: Leaf[] = skills.map((group, i) => {
    const meta = SKILL_META[group.category] ?? {
      label: group.category,
      status: "active" as LeafStatus,
      blurb: "",
    };
    return {
      id: `skill-${i}`,
      branch: "skills",
      label: meta.label,
      blurb: meta.blurb,
      status: meta.status,
      tag: meta.status.toUpperCase(),
      items: group.items.map((it) => it.name),
    };
  });

  // ---- Projects: EVERY build is a leaf, each jumping to the skills it proves.
  // Fully data-driven: add a project to data.ts and it lands here automatically.
  const projectLeaves: Leaf[] = projects.map((p, idx) => {
    const cross = categoriesForProject(p).map(skillIdByCategory).filter(Boolean);
    return {
      id: `project-${idx}`,
      branch: "projects",
      label: PROJECT_SHORT[idx] ?? deriveShort(p.name),
      blurb: p.blurb,
      filled: true,
      tags: p.stack,
      cross,
      domain: p.domain,
      metrics: p.metrics,
      arch: p.arch,
      link: p.link,
    };
  });

  // Back-link skills -> the projects that prove them (so a Skills row jumps to
  // real builds and vice-versa). All projects are nodes, so all are valid jumps.
  skillLeaves.forEach((leaf, i) => {
    const cat = skills[i].category;
    leaf.cross = projects
      .map((p, idx) => ({ idx, cats: categoriesForProject(p) }))
      .filter(({ cats }) => cats.includes(cat))
      .map(({ idx }) => `project-${idx}`);
  });

  // ---- Resume: EVERY role + education becomes a leaf (nothing dropped). Short
  // node label by org; a small override keeps the two IBM roles distinct. Add a
  // role to data.ts and it auto-appears here. The full PDF + plain-text export
  // stays available from the panel (see NodePanel).
  const RESUME_SHORT: Record<string, string> = {
    "AI Solutions Engineer, Horizon West Market": "IBM",
    "Brand Technical Specialist, Data and AI": "Brand Tech",
    "Software Engineering Bootcamp": "Education",
  };
  const resumeRows = [...resume.experience, ...resume.education];
  const resumeLeaves: Leaf[] = resumeRows.map((e, i) => ({
    id: `resume-${i}`,
    branch: "resume",
    label: RESUME_SHORT[e.title] ?? (e.org ? deriveShort(e.org) : deriveShort(e.title)),
    role: e.title,
    org: e.org,
    tag: e.when ? e.when.split(/\s*[-–]\s*/)[0] : undefined,
    blurb: e.org ? `${e.title} · ${e.org}` : e.title,
    points: e.points,
  }));

  // ---- Contact: real links ----
  const contactLeaves: Leaf[] = [
    { label: "GitHub", value: "@sbrick26", href: profile.links.github },
    { label: "LinkedIn", value: "swayam-barik", href: profile.links.linkedin },
    { label: "Email", value: profile.links.email, href: `mailto:${profile.links.email}` },
  ].map((c, i) => ({
    id: `contact-${i}`,
    branch: "contact",
    label: c.label,
    blurb: c.value,
    href: c.href,
  }));

  // ---- Changelog: panel-only, no canvas leaves (owner's rule). The FULL
  // history rides along; the panel folds it behind "show all".
  const versions = changelog.map((c) => ({
    version: c.version,
    date: c.date,
    changes: c.changes,
  }));

  // ---- Updates: panel-only live feed, newest first. updates.json is
  // newest-last and grows freely (the 16:00 check-in appends to it), so this
  // stays current with zero design work.
  const feed = [...updates].reverse().map((u) => ({
    date: u.date,
    time: u.time,
    text: u.text,
    tag: u.tag,
  }));

  // ---- Pipeline: panel-only walk of the agent system that ships this site.
  // The step sequence is the real lifecycle; the run facts (version/date/idea)
  // come from the latest changelog entry via lib/pipeline.ts.
  const pipelineRun = buildPipelineRun(changelog);
  const flow = pipelineRun.stages.map((s) => ({
    key: s.key,
    label: s.node,
    detail: s.detail,
    token: s.token,
    actor: s.actor,
  }));

  const branchDefs: Branch[] = [
    {
      id: "about",
      label: "About",
      title: "About",
      lead: "AI Solutions Engineer at IBM. I build autonomous multi-agent systems and MCP servers that modernize enterprise mainframe and ERP workloads - and ship them end to end.",
      leaves: aboutLeaves,
      ...posOf("about"),
    },
    {
      id: "skills",
      label: "Skills",
      title: "Skills",
      lead: "Where the strength concentrates, and where it is headed next.",
      leaves: skillLeaves,
      ...posOf("skills"),
    },
    {
      id: "resume",
      label: "Resume",
      title: "Resume",
      lead: "The short version.",
      leaves: resumeLeaves,
      ...posOf("resume"),
    },
    {
      id: "updates",
      label: "Updates",
      title: "Live Feed",
      lead: "What I'm actually working on, newest first - the same log the agents write to as this site ships.",
      leaves: [],
      feed,
      ...posOf("updates"),
    },
    {
      id: "pipeline",
      label: "Pipeline",
      title: "The Pipeline",
      lead: "The agent system that builds this site: one idea a day rides a branch through review, CI, and a preview to a one-tap approval, then ships itself to prod.",
      leaves: [],
      flow,
      run: { version: pipelineRun.version, date: pipelineRun.date, idea: pipelineRun.idea },
      ...posOf("pipeline"),
    },
    {
      id: "changelog",
      label: "Changelog",
      title: "Changelog",
      lead: "How this site keeps shipping its own improvements.",
      leaves: [],
      versions,
      ...posOf("changelog"),
    },
    {
      id: "projects",
      label: "Projects",
      title: "Projects",
      lead: "Selected builds. Each links back to the skills it used.",
      leaves: projectLeaves,
      ...posOf("projects"),
    },
    {
      id: "contact",
      label: "Contact",
      title: "Contact",
      lead: "Open to interesting problems.",
      leaves: contactLeaves,
      ...posOf("contact"),
    },
  ];

  const branchById = {} as Record<BranchId, Branch>;
  const leafById: Record<string, Leaf> = {};
  const branchOfLeaf: Record<string, BranchId> = {};
  for (const b of branchDefs) {
    branchById[b.id] = b;
    for (const leaf of b.leaves) {
      leafById[leaf.id] = leaf;
      branchOfLeaf[leaf.id] = b.id;
    }
  }

  // ---- Second layer: every skill ITEM becomes a sub-leaf under its group,
  // cross-linked to the projects whose stacks prove it. The intricate web,
  // grown entirely from content/data.ts.
  const subLeavesByParent: Record<string, SubLeaf[]> = {};
  const subLeafById: Record<string, SubLeaf> = {};
  skills.forEach((group, i) => {
    const parent = `skill-${i}`;
    const subs = group.items.map((it, j): SubLeaf => {
      const cross = projects
        .map((p, idx) => ({ idx, hit: p.stack.some((t) => itemMatchesToken(it.name, t)) }))
        .filter(({ hit }) => hit)
        .map(({ idx }) => `project-${idx}`);
      return { id: `${parent}-item-${j}`, parent, label: subShort(it.name), full: it.name, cross };
    });
    subLeavesByParent[parent] = subs;
    for (const s of subs) {
      subLeafById[s.id] = s;
      branchOfLeaf[s.id] = "skills";
    }
  });

  return {
    me: {
      name: profile.name,
      role: profile.role,
      summary: profile.summary,
      initials: "SB",
      location: profile.location,
      links: [
        { label: "GitHub", href: profile.links.github },
        { label: "LinkedIn", href: profile.links.linkedin },
        { label: "Email", href: `mailto:${profile.links.email}` },
      ],
      demo: profile.demo,
    },
    branches: branchDefs,
    branchById,
    leafById,
    branchOfLeaf,
    subLeavesByParent,
    subLeafById,
  };
}
