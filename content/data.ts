// Seed content for the terminal site.
// PLACEHOLDER values are marked TODO. Phase 3 wires this to the live career corpus,
// so the work feed and resume stay in sync and never drift.

import updatesJson from "./updates.json";
import changelogJson from "./changelog.json";

export const profile = {
  name: "Swayam Barik",
  handle: "swayam",
  role: "AI Forward Deployed Engineer @ IBM",
  location: "San Francisco, CA",
  status: "building autonomous dev pipelines",
  summary:
    "AI Forward Deployed Engineer at IBM, working presales through post-sales: from first pilot to production systems. In my free time I set up agentic loops that build tools for myself and others. This site is one of them, and it ships its own improvements daily.",
  links: {
    github: "https://github.com/sbrick26",
    linkedin: "https://www.linkedin.com/in/swayam-barik",
    email: "swayambarik@gmail.com",
  },
  // The automatic-portfolio pipeline demo. Two cuts of the same video; the
  // "Watch the demo" button picks the vertical one on phone-sized screens.
  demo: {
    horizontal: "https://imsway-demo-assets.s3.us-east-2.amazonaws.com/swaygent-demo-horizontal.mp4",
    vertical: "https://imsway-demo-assets.s3.us-east-2.amazonaws.com/swaygent-demo-vertical.mp4",
  },
};

export const about: string[] = [
  "I'm an AI Forward Deployed Engineer at IBM in San Francisco, where I design and lead custom proof-of-concept engagements across a portfolio of 116 enterprise accounts: production MCP servers for IBM i RPG modernization, LucidLink, and Sterling order-management; an agentic HR framework live on Workday and ServiceNow; and full-day enterprise hackathons that turn evaluations into adoptions.",
  "Before that I shipped full-stack web, mobile, and IoT products at Qureez for energy startups, and built user-facing iOS features on LinkedIn's profile team that reached hundreds of thousands of members.",
  "This portfolio is itself a live deployment: a thin front agent on a Mac Mini routes work to project leads and workers, opens pull requests to GitHub, runs CI gates, and deploys to AWS through SST.",
  "Every morning the system picks one useful improvement, builds it on a branch, runs deterministic checks, reviews it, and opens a PR. User-visible changes wait for my one-tap approval over Telegram.",
];

export type Skill = { name: string; level: number }; // level 0-100
export type SkillGroup = { category: string; accent: string; items: Skill[] };

// Grouped for an AI Solutions Architect screen, not a keyword dump. Lead with
// the core stack (Python + SQL), then AI/agents (where the evidence is), then
// cloud and data, and an explicit customer-facing row. Each skill is backed by
// a shipped, measured fact in the career hub.
export const skills: SkillGroup[] = [
  {
    category: "languages + core",
    accent: "var(--color-term-blue)",
    items: [
      { name: "Python", level: 88 },
      { name: "SQL / Db2", level: 80 },
      { name: "TypeScript / JS", level: 90 },
      { name: "Swift / Obj-C", level: 76 },
    ],
  },
  {
    category: "ai / agents",
    accent: "var(--color-term-orange)",
    items: [
      { name: "watsonx Orchestrate", level: 90 },
      { name: "Agent SDK", level: 88 },
      { name: "MCP servers", level: 88 },
      { name: "Agent guardrails / governance", level: 86 },
      { name: "Mainframe modernization (Z / i)", level: 84 },
      { name: "LLM APIs + prompts", level: 88 },
      { name: "Evals", level: 84 },
      { name: "IBM Bob", level: 90 },
    ],
  },
  {
    category: "cloud + data",
    accent: "var(--color-term-green)",
    items: [
      { name: "AWS", level: 82 },
      { name: "OAuth 2.0 / OpenAPI", level: 86 },
      { name: "MS Graph / Workday / ServiceNow", level: 82 },
      { name: "Docker", level: 80 },
    ],
  },
  {
    category: "customer-facing",
    accent: "var(--color-term-cyan)",
    items: [
      { name: "POC design + deployment ownership", level: 92 },
      { name: "Technical scoping + discovery", level: 88 },
      { name: "Stakeholder management", level: 86 },
      { name: "Competitive displacement + ROI", level: 86 },
      { name: "Tech lead / intern leadership", level: 84 },
    ],
  },
];

export type ProjectMetric = { value: string; label: string };

// A node in a project's architecture micro-diagram. `kind` only tints the chip
// (color-codes the role); the meaning lives in `label`. Labels are ALWAYS a
// generic tech or role name - agent, MCP server, SSH tunnel, live system - and
// NEVER a client or a client's named system. The privacy guard in
// test/content.test.ts serializes every project, so a client name leaking into
// an arch label would fail the build, by design.
export type ArchKind = "actor" | "gateway" | "guard" | "system" | "store" | "io";
export type ArchNode = { label: string; kind: ArchKind };

export type Project = {
  name: string;
  blurb: string;
  stack: string[];
  status: "live" | "building" | "shipped" | "archived";
  link?: string;
  // The industry the engagement ran in (never the client name). Renders as the
  // card's context label.
  domain?: string;
  // Two or three scannable highlights pulled straight from the blurb so the
  // numbers that matter are not buried in prose. No new claims live here.
  metrics?: ProjectMetric[];
  // A compact, schematic left-to-right flow that shows the system shape at a
  // glance (the strongest honest visual when engagements are confidential and
  // no screenshots are allowed). Rendered by ArchDiagram as tinted chips joined
  // by `->`. Keep it to ~4-5 short nodes so the card stays scannable on mobile.
  arch?: ArchNode[];
};

// Client engagements are generalized on purpose: industry, never the client name.
export const projects: Project[] = [
  {
    name: "autonomous portfolio + agent pipeline",
    domain: "this site, live",
    blurb:
      "Built this site as a multi-agent system that ships its own daily improvements: front agent on Telegram, per-project leads and workers, PRs to GitHub, CI gates, deploy to AWS via SST.",
    metrics: [
      { value: "daily", label: "self-shipped improvements" },
      { value: "1-tap", label: "Telegram approval to ship" },
      { value: "CI-gated", label: "every pull request" },
    ],
    arch: [
      { label: "front agent", kind: "actor" },
      { label: "project lead", kind: "gateway" },
      { label: "build + review", kind: "actor" },
      { label: "CI gates", kind: "guard" },
      { label: "AWS / SST", kind: "system" },
    ],
    stack: ["Next.js", "TypeScript", "Claude Code", "SST", "AWS"],
    status: "building",
    link: "https://github.com/sbrick26/auto-portfolio",
  },
  {
    name: "IBM i RPG modernization MCP server",
    domain: "transport & logistics",
    blurb:
      "Built and hardened the MCP server that lets an AI agent pull, compile, run, and debug legacy RPG on a live IBM i over SSH: write allowlists, blocked destructive ops, driver-escaped bindings, env-loaded creds. A companion Bob 2.0 solution drove an agent end to end on a single 10,000+ line legacy file - business-rule extraction, fixed-to-free RPG modernization, then compile-run-test on the box. Cleared enterprise security review; two major transport and logistics companies adopted the product.",
    metrics: [
      { value: "10K+ lines", label: "RPG modernized end to end" },
      { value: "2", label: "logistics firms adopted" },
      { value: "cleared", label: "enterprise security review" },
    ],
    arch: [
      { label: "AI agent", kind: "actor" },
      { label: "MCP server", kind: "gateway" },
      { label: "write allowlist", kind: "guard" },
      { label: "SSH tunnel", kind: "gateway" },
      { label: "IBM i / Db2", kind: "system" },
    ],
    stack: ["TypeScript", "MCP", "IBM i / RPG", "Db2", "SSH"],
    status: "shipped",
  },
  {
    name: "IBM Z mainframe BMS-to-React modernization solution",
    domain: "financial services",
    blurb:
      "Built a working solution that takes an AI coding agent from legacy IBM Z CICS BMS green-screens to a modern React UI - the agent generates a React front end that calls the live mainframe for data and renders it, real green-screen-to-React modernization of a running Z system. Built on the public IBM CICS insurance sample app and presented live as the centerpiece of a full-day Bobathon to 40 financial-services developers, after which the client moved into a trial of the premium Z package.",
    metrics: [
      { value: "CICS to React", label: "live mainframe modernized" },
      { value: "40 devs", label: "live session audience" },
      { value: "trial", label: "premium Z package landed" },
    ],
    arch: [
      { label: "AI agent", kind: "actor" },
      { label: "React UI gen", kind: "system" },
      { label: "live IBM Z", kind: "system" },
      { label: "CICS data", kind: "store" },
    ],
    stack: ["IBM Z", "CICS / BMS", "React", "AI coding agent"],
    status: "shipped",
  },
  {
    name: "Sterling order-management MCP platform",
    domain: "enterprise order management",
    blurb:
      "Built an MCP platform over a live Sterling Order Management Suite for natural-language diagnosis and remediation of production order issues. A Python MCP server exposes ~20 tools across four namespaces plus a catch-all over all 1,060 Sterling APIs, reusing a persistent SSH tunnel for ~50ms calls. Demonstrated an agent fixing a real production bug (a Java NPE in a user-exit JAR) end to end, from log stack trace to deploy, cutting MTTR from hours to minutes with full audit trails.",
    metrics: [
      { value: "1,060", label: "Sterling APIs exposed" },
      { value: "~50ms", label: "tunneled tool calls" },
      { value: "hrs to mins", label: "MTTR cut" },
    ],
    arch: [
      { label: "AI agent", kind: "actor" },
      { label: "Python MCP", kind: "gateway" },
      { label: "SSH tunnel", kind: "gateway" },
      { label: "live OMS", kind: "system" },
    ],
    stack: ["MCP", "Python", "SSH ControlMaster", "Sterling OMS", "Java / Liberty"],
    status: "shipped",
  },
  {
    name: "agentic HR framework (Workday + ServiceNow)",
    domain: "sports & entertainment",
    blurb:
      "Designed an agentic HR framework with policy-governance guardrails for a global sports entertainment company, live on real Workday and ServiceNow tenants inside a custom portal. A two-layer architecture (reusable app integrations + use-case orchestrators) handles job changes, promotion letters, and compensation checks against banding policy before any write. Moved the account to pricing and deployment.",
    metrics: [
      { value: "3", label: "live HR workflows" },
      { value: "2 tenants", label: "real Workday + ServiceNow" },
      { value: "policy-gated", label: "every write" },
    ],
    arch: [
      { label: "AI agent", kind: "actor" },
      { label: "orchestrators", kind: "gateway" },
      { label: "policy guard", kind: "guard" },
      { label: "Workday + ServiceNow", kind: "system" },
    ],
    stack: ["watsonx Orchestrate", "Workday", "ServiceNow", "OAuth 2.0", "OpenAPI"],
    status: "shipped",
  },
  {
    name: "AIDLC guardrails framework",
    domain: "utility & energy",
    blurb:
      "Engineered an enterprise AIDLC governance framework: two sibling repos with byte-identical code where the only difference is the governance layer, so the same prompts show agent behavior with guardrails on vs off. Three enforcement layers - file-access blocklist, plain-English NIST/FedRAMP policies with audit trails, and execution allowlists - plus a GitHub CI gate that audits every PR diff against the committed rules. The public twin ships the open pattern.",
    metrics: [
      { value: "3-layer", label: "enforced agent governance" },
      { value: "every PR", label: "audited against policy" },
      { value: "public twin", label: "open-sourced pattern" },
    ],
    arch: [
      { label: "agent", kind: "actor" },
      { label: "governance layer", kind: "guard" },
      { label: "audit trail", kind: "store" },
      { label: "CI diff gate", kind: "guard" },
    ],
    stack: ["AIDLC", "CI gate", "NIST / FedRAMP", "Flask", "policy-as-code"],
    status: "shipped",
  },
  {
    name: "coding-agent bake-off platform",
    domain: "competitive evidence engine",
    blurb:
      "Built a local web app benchmarking three coding agents side by side on identical scenarios. Each gets a fresh isolated repo, streams into a three-column live UI, and produces an objectively verified report: cost, time, tokens, tests added, git diff, and a security verdict from pytest, semgrep, and a per-scenario verify.sh. The evidence engine behind IBM competitive displacement: marketing claims become reproducible numbers.",
    metrics: [
      { value: "3", label: "coding agents benchmarked" },
      { value: "pytest + semgrep", label: "verified verdicts" },
      { value: "reproducible", label: "cost, time, security" },
    ],
    arch: [
      { label: "scenario", kind: "io" },
      { label: "isolated repos", kind: "store" },
      { label: "3 coding agents", kind: "actor" },
      { label: "pytest + semgrep", kind: "guard" },
      { label: "scored report", kind: "io" },
    ],
    stack: ["FastAPI", "SSE", "semgrep", "pytest", "SQLite"],
    status: "shipped",
  },
  {
    name: "bobwork: agent council UI",
    domain: "personal project",
    blurb:
      "Built a web app for an AI coding CLI with a council mode: 5 parallel agent instances with distinct thinking styles answer anonymized via Fisher-Yates shuffle, 5 independent peer reviewers vote, and a chairman synthesizes - explicit bias mitigation designed in. Real-time WebSocket streaming, persistent SQLite chat history, and a 146-test suite (90 backend, 14 frontend, 42 council) gates every merge.",
    metrics: [
      { value: "5", label: "parallel council agents" },
      { value: "146", label: "tests gating every merge" },
    ],
    arch: [
      { label: "chat UI", kind: "io" },
      { label: "5 council agents", kind: "actor" },
      { label: "peer review", kind: "guard" },
      { label: "chairman synthesis", kind: "actor" },
    ],
    stack: ["Next.js", "React", "Node.js", "SQLite"],
    status: "shipped",
  },
  {
    name: "email triage agent",
    domain: "beverage manufacturing",
    blurb:
      "Shipped a watsonx Orchestrate agent for a national beverage manufacturer drowning in 2,000-3,000 EDI alert emails a day: an LLM classifies each by severity, files it into priority folders, and fires Teams alerts on the ~1% critical. Secured Graph access via OAuth 2.0 delegated scopes. Won the platform bake-off vs Copilot Studio.",
    metrics: [
      { value: "2-3K/day", label: "EDI alerts triaged" },
      { value: "~1%", label: "critical, auto-escalated" },
      { value: "won", label: "bake-off vs Copilot Studio" },
    ],
    arch: [
      { label: "EDI inbox", kind: "io" },
      { label: "LLM classifier", kind: "actor" },
      { label: "severity routing", kind: "guard" },
      { label: "folders + Teams", kind: "system" },
    ],
    stack: ["watsonx Orchestrate", "Python", "Microsoft Graph", "OAuth 2.0"],
    status: "shipped",
  },
  {
    name: "data cleansing agent",
    domain: "state government",
    blurb:
      "Built an AI-readiness solution for a state government agency: an agent finds and fixes quality issues across ~1,000 citizen records through a least-privilege Informix MCP server (4 tools), fully container-isolated for security review. Reaches 95%+ standardized formats and zero duplicates, turning days of manual work into minutes.",
    metrics: [
      { value: "95%+", label: "standardized formats" },
      { value: "zero", label: "duplicate records" },
      { value: "days to mins", label: "manual work cut" },
    ],
    arch: [
      { label: "AI agent", kind: "actor" },
      { label: "Informix MCP", kind: "gateway" },
      { label: "container guard", kind: "guard" },
      { label: "clean records", kind: "store" },
    ],
    stack: ["Node.js", "MCP", "Informix", "Docker"],
    status: "shipped",
  },
];

export type Update = {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  text: string;
  tag?: string;
};

// PIPELINE SEAM: the updates feed lives in content/updates.json, newest last.
// Workers append an entry there when something is worth posting. Sources:
// any project's work log, plus the 4pm daily check-in when the gathered info
// synthesizes into a real update. Nothing here requires a resume change;
// the resume only regenerates when the career corpus warrants it (Phase 3).
export const updates: Update[] = updatesJson as Update[];

export type ChangelogEntry = { version: string; date: string; changes: string[] };

// PIPELINE SEAM: scripts append an entry here on every version bump (newest first).
export const changelog: ChangelogEntry[] = changelogJson as ChangelogEntry[];

export type ResumeItem = { title: string; org?: string; when?: string; points: string[] };

// Seeded from the real resume (career-corpus/source/resume-2026-06-10.txt).
// Condensed for on-screen reading; Phase 3 regenerates this from the corpus.
// <resume-export:resume> AUTO-MANAGED: applied from career-engine dist/resume-export.json
// by scripts/apply-resume-export.mjs - do not hand-edit between these markers.
export const resume: { summary: string; experience: ResumeItem[]; education: ResumeItem[]; projects?: { name: string; desc: string }[]; skillsLines?: { label: string; items: string }[] } = {
  "summary": "",
  "experience": [
    {
      "title": "AI Forward Deployed Engineer",
      "org": "IBM, Client Engineering - San Francisco, CA",
      "when": "Jan 2026 - Present",
      "points": [
        "Manage technical strategy and full engagements end to end for 20+ large and mid-market enterprise accounts in the western US - leading requirements discovery, drafting engagement plans, and hosting in-person and virtual working sessions that win buy-in - through architecture, build, and post-sales adoption",
        "Main speaker at the ALIGN AI Executive Summit (SF): live demonstration of IBM Bob (Agentic Coding IDE/Shell) running the full AI SDLC - Jira planning, Figma design, development, CI/CD, MCP deployment into watsonx Orchestrate - with agent identity via HashiCorp Vault and every governance decision tracked",
        "Design and build the full agentic stack - agents, MCP servers (Python/TypeScript), tools, skills, knowledge and data layers - for clients in 6+ industries: a Sterling order-management agent doing natural-language diagnosis and remediation, a secure IBM i/RPG modernization MCP server, email-classification and data-readiness agents, a 6-agent HR system over Workday and Teams (caching, cross-step memory), and a live in-game translation agent (speech-to-text on Orchestrate) for a major video game publisher",
        "Engineer and guide Bob rollouts - custom rules, skills, hooks, workflows, and modes; CI/CD checks and deployments run by Bob shells; agent and MCP builds deployed into watsonx Orchestrate - with governance, usage-tracking, and cost best practices, on legacy codebases (RPG on IBM i, COBOL to Java, mainframe green-screens to React) and modern ones; 3 enterprise deals closed",
        "Created Bobathon for IBM's Horizon West market: a workshop-plus-hackathon format teaching teams Bob's agents, skills, rules, and governance hooks wired into their real SDLC (Jira, Figma, GitHub, Monday, watsonx Orchestrate, and more) - 20+ run, about 1 in 3 purchased and adopted IBM Bob",
        "Grow adoption after the sale and expand it: initial workflows, rules/modes/skills setup, best-practice guides, then the next use case - an HR launch grew into IT-team automation, in-game translation is spreading to more titles - 30-40% usage and token growth",
        "Lead 5 engineers building a plugin library (skills, rules, modes, MCPs) across 10+ IBM products; mentored intern teams to a 1st-of-25 hackathon win and a tool now official inside IBM; beta contributor on Bob 2.0's GA and its premium IBM i, Z, and Java packages",
        "Feed the field back into the product: work with product teams to reuse and embed deployed client code into watsonx Orchestrate and IBM Bob - 4 major product improvements, helping lead the sales-to-client-to-product pipeline"
      ]
    },
    {
      "title": "AI Solutions Engineer, Data and AI",
      "org": "IBM, Client Engineering - San Francisco, CA",
      "when": "Mar 2025 - Jan 2026",
      "points": [
        "Exceeded first-year quota by 125% owning technical evaluations end to end across 20+ enterprise accounts - POC wins head-to-head against Microsoft Azure OpenAI, AWS Bedrock, and Google Vertex AI",
        "Designed and presented a live watsonx demonstration at AWS re:Invent that drew ~400 attendees, generating hundreds of inbound client conversations and new pipeline",
        "Led competitive displacement against GitHub Copilot, Cursor, Claude Code, Codex, and other AI tooling with tailored technical narratives and ROI frameworks",
        "Built repeatable, client-specific demonstration frameworks turning business pain points into quantifiable watsonx.ai, Orchestrate, watsonx.data, and watsonx.governance outcomes - cutting time-to-close, improving win rates"
      ]
    },
    {
      "title": "Software Engineer",
      "org": "Qureez - Pleasanton, CA",
      "when": "Feb 2022 - Apr 2025",
      "points": [
        "Delivered full-stack web, mobile, and IoT platforms for startups (TypeScript, React, Next.js, Node.js, AWS, MongoDB) driving energy reductions across large commercial and industrial buildings, while project-managing a 5-person offshore team",
        "Engineered an ERCOT grid-signal integration hitting an 80% success rate during grid overloads; shipped a role-based access control system to AWS Marketplace serving hundreds of accounts",
        "Created AI Bench Studio, an AWS Marketplace platform for benchmarking AI infrastructure (YCSB/TSBS, Grafana); led a PWA migration that boosted mobile usage ~50%"
      ]
    },
    {
      "title": "Software Engineer, iOS Profile Team",
      "org": "LinkedIn - San Francisco, CA",
      "when": "Jun 2022 - 2024",
      "points": [
        "Shipped core profile features in Swift/Objective-C across the Skills First initiative: Top Skills (600K+ members engaged, ~10% weekly-active lift), Career Break Associations (~11% lift), Next Best Action prompts (~14% more profile updates)",
        "Built reusable API-driven UI components adopted across profile surfaces - a stateful Connect/Follow button, a re-orderable skills module - and ran LIX/T-REX A/B experiments end to end; organized monthly meetups for a 35-person early-career cohort"
      ]
    },
    {
      "title": "Software Developer",
      "org": "ALNA Properties - Dallas, TX",
      "when": "Aug 2021 - Dec 2021",
      "points": [
        "Built a Python/Firebase tool with image-processing AI scoring thousands of MLS listings a day, cutting outsourced review costs 80%"
      ]
    }
  ],
  "education": [
    {
      "title": "Software Engineering Bootcamp",
      "org": "Dominican University of California",
      "when": "2020",
      "points": []
    }
  ],
  "projects": [
    {
      "name": "Swaygent",
      "desc": "self-running agentic system maintaining imsway.dev and this resume: 13 Claude agents behind one orchestrator, Telegram one-tap approvals, golden-set evals, self-healing audits, keyless CI deploys (GitHub OIDC) onto AWS with usage metering, cost tracking, alerting. Live at imsway.dev; engine at github.com/sbrick26/career-engine"
    },
    {
      "name": "Bobwork",
      "desc": "web app for an agentic CLI with a council mode - 5 parallel agents, peer review, chairman synthesis (Node.js, Next.js, SQLite, WebSockets); Bob runs in the pipeline: automated review checks, branch management, code hygiene and cleanup with regression testing"
    },
    {
      "name": "Coding-agent benchmarking platform",
      "desc": "benchmarks IBM Bob against Claude Code, Codex, and others - standard suites plus custom benchmarks (multi-turn evolving requirements, enterprise migrations verified on real databases) behind integrity gates that catch reward-hacking"
    }
  ],
  "skillsLines": [
    {
      "label": "AI and agents",
      "items": "agentic architecture, orchestration, MCP, RAG, prompt engineering - IBM Bob, watsonx (.ai, Orchestrate, .data, .governance), Claude Code, Managed Agents, Codex, Cursor; models: Granite, Llama, GPT 5.4, gpt-oss, Claude (Opus, Sonnet, Fable 5, Haiku)"
    },
    {
      "label": "Governance and safety",
      "items": "governed AI SDLC (audit logging, blocking rules, tracked decisions), agent identity (HashiCorp Vault), privacy guards in CI, agent evaluation with integrity gates"
    },
    {
      "label": "Engineering",
      "items": "TypeScript, JavaScript, Python, Swift, Objective-C; React, Next.js, Node.js, AWS (Lambda, CloudFront, S3, OIDC), GitHub Actions, MongoDB, Firebase, SQLite, WebSockets, GraphQL, Telegram Bot API"
    },
    {
      "label": "Field",
      "items": "discovery and solutioning, executive briefings, public speaking and live demonstrations, POC/pilot creation and management, ROI frameworks, competitive positioning, pre- and post-sales adoption"
    },
    {
      "label": "Education",
      "items": "Dominican University of California - Software Engineering Bootcamp, 2020"
    }
  ]
};
// </resume-export:resume>
