// Seed content for the terminal site.
// PLACEHOLDER values are marked TODO. Phase 3 wires this to the live career corpus,
// so the work feed and resume stay in sync and never drift.

import updatesJson from "./updates.json";
import changelogJson from "./changelog.json";

export const profile = {
  name: "Swayam Barik",
  handle: "swayam",
  role: "AI Solutions Architect @ IBM",
  location: "San Francisco, CA",
  status: "building autonomous dev pipelines",
  summary:
    "AI engineer at IBM by day, builder of systems that build themselves by night. This site is run by a fleet of agents that ship improvements to it daily.",
  links: {
    github: "https://github.com/sbrick26",
    linkedin: "https://www.linkedin.com/in/swayam-barik",
    email: "swayambarik@gmail.com",
  },
};

export const about: string[] = [
  "I'm an AI Solutions Engineer at IBM in San Francisco, where I design and lead custom proof-of-concept engagements across a portfolio of 116 enterprise accounts: production MCP servers for IBM i RPG modernization, LucidLink, and Sterling order-management; an agentic HR framework live on Workday and ServiceNow; and full-day enterprise hackathons that turn evaluations into adoptions.",
  "Before that I shipped full-stack web, mobile, and IoT products at Qureez for energy startups, and built user-facing iOS features on LinkedIn's profile team that reached hundreds of thousands of members.",
  "This portfolio is itself a live demo: a thin front agent on a Mac Mini routes work to project leads and workers, opens pull requests to GitHub, runs CI gates, and deploys to AWS through SST.",
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

export type Project = {
  name: string;
  blurb: string;
  stack: string[];
  status: "live" | "building" | "shipped" | "archived";
  link?: string;
};

// Client engagements are generalized on purpose: industry, never the client name.
export const projects: Project[] = [
  {
    name: "autonomous portfolio + agent pipeline",
    blurb:
      "Built this site as a multi-agent system that ships its own daily improvements: front agent on Telegram, per-project leads and workers, PRs to GitHub, CI gates, deploy to AWS via SST.",
    stack: ["Next.js", "TypeScript", "Claude Code", "SST", "AWS"],
    status: "building",
    link: "https://github.com/sbrick26/auto-portfolio",
  },
  {
    name: "IBM i RPG modernization MCP server",
    blurb:
      "Built and hardened the MCP server that lets an AI agent pull, compile, run, and debug legacy RPG on a live IBM i over SSH: write allowlists, blocked destructive ops, driver-escaped bindings, env-loaded creds. A companion Bob 2.0 demo drove an agent end to end on a single 10,000+ line legacy file - business-rule extraction, fixed-to-free RPG modernization, then compile-run-test on the box. Cleared enterprise security review; two major transport and logistics companies adopted the product.",
    stack: ["TypeScript", "MCP", "IBM i / RPG", "Db2", "SSH"],
    status: "shipped",
  },
  {
    name: "Sterling order-management MCP platform",
    blurb:
      "Built an MCP platform over a live Sterling Order Management Suite for natural-language diagnosis and remediation of production order issues. A Python MCP server exposes ~20 tools across four namespaces plus a catch-all over all 1,060 Sterling APIs, reusing a persistent SSH tunnel for ~50ms calls. Demonstrated an agent fixing a real production bug (a Java NPE in a user-exit JAR) end to end, from log stack trace to deploy, cutting MTTR from hours to minutes with full audit trails.",
    stack: ["MCP", "Python", "SSH ControlMaster", "Sterling OMS", "Java / Liberty"],
    status: "shipped",
  },
  {
    name: "agentic HR framework (Workday + ServiceNow)",
    blurb:
      "Designed an agentic HR framework with policy-governance guardrails for a global sports entertainment company, live on real Workday and ServiceNow tenants inside a custom portal. A two-layer architecture (reusable app integrations + use-case orchestrators) handles job changes, promotion letters, and compensation checks against banding policy before any write. Moved the account to pricing and deployment.",
    stack: ["watsonx Orchestrate", "Workday", "ServiceNow", "OAuth 2.0", "OpenAPI"],
    status: "shipped",
  },
  {
    name: "LucidLink MCP server + enablement kit",
    blurb:
      "Built a production-shaped LucidLink MCP server - 20 tools tiered into auto-approvable reads, dry-run-by-default guarded writes, and feature-flagged S3 Connect - plus a full Bob enablement pack and a 3-hour hands-on customer workshop teaching partners to build on the Python SDK with an AI agent. Safety designed in: token hygiene, guarded writes, chunked streaming for large media.",
    stack: ["MCP", "Python", "LucidLink SDK", "uv"],
    status: "shipped",
  },
  {
    name: "AIDLC guardrails framework",
    blurb:
      "Engineered an enterprise AIDLC governance framework: two sibling repos with byte-identical code where the only difference is the governance layer, so the same prompts show agent behavior with guardrails on vs off. Three enforcement layers - file-access blocklist, plain-English NIST/FedRAMP policies with audit trails, and execution allowlists - plus a GitHub CI gate that audits every PR diff against the committed rules. The public twin ships the open pattern.",
    stack: ["AIDLC", "CI gate", "NIST / FedRAMP", "Flask", "policy-as-code"],
    status: "shipped",
  },
  {
    name: "coding-agent bake-off platform",
    blurb:
      "Built a local web app benchmarking three coding agents side by side on identical scenarios. Each gets a fresh isolated repo, streams into a three-column live UI, and produces an objectively verified report: cost, time, tokens, tests added, git diff, and a security verdict from pytest, semgrep, and a per-scenario verify.sh. The evidence engine behind IBM competitive displacement: marketing claims become reproducible numbers.",
    stack: ["FastAPI", "SSE", "semgrep", "pytest", "SQLite"],
    status: "shipped",
  },
  {
    name: "email triage agent",
    blurb:
      "Shipped a watsonx Orchestrate agent for a national beverage manufacturer drowning in 2,000-3,000 EDI alert emails a day: an LLM classifies each by severity, files it into priority folders, and fires Teams alerts on the ~1% critical. Secured Graph access via OAuth 2.0 delegated scopes. Won the platform bake-off vs Copilot Studio.",
    stack: ["watsonx Orchestrate", "Python", "Microsoft Graph", "OAuth 2.0"],
    status: "shipped",
  },
  {
    name: "data cleansing agent",
    blurb:
      "Built an AI-readiness demo for a state government agency: an agent finds and fixes quality issues across ~1,000 citizen records through a least-privilege Informix MCP server (4 tools), fully container-isolated for security review. Reaches 95%+ standardized formats and zero duplicates, turning days of manual work into minutes.",
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
export const resume = {
  summary:
    "AI Solutions Architect and forward-deployed engineer owning enterprise agent deployments across 116 accounts: security-hardened MCP servers and agentic frameworks running live in production. Exceeded first-year quota by 125%.",
  experience: [
    {
      title: "AI Solutions Engineer, Horizon West Market",
      org: "IBM, Client Engineering",
      when: "Jan 2026 - Present",
      points: [
        "Built 3 production MCP servers - IBM i RPG modernization, LucidLink, and Sterling order-management (20 tools, 1,060 APIs) - letting AI agents drive live enterprise systems over SSH.",
        "Designed an agentic HR framework with policy guardrails across 3 live workflows - job changes, promotions, comp checks - on Workday and ServiceNow for a sports entertainment client.",
        "Engineered the AIDLC guardrails framework (NIST/FedRAMP policy, audit trails, CI diff gate) and a 3-agent bake-off platform making IBM-vs-competitor claims reproducible.",
        "Founded and lead a 5-intern initiative shipping a guardrailed agent-skills + MCP library across 10+ IBM products; ran Bobathon, a hackathon, 10 times at 15-20 engineers each.",
        "Lead competitive displacement vs GitHub Copilot, Cursor, and Claude Code with ROI frameworks backed by a 3-agent bake-off producing reproducible cost, security, and test evidence per tool.",
      ],
    },
    {
      title: "Brand Technical Specialist, Data and AI",
      org: "IBM",
      when: "Mar 2025 - Jan 2026",
      points: [
        "Exceeded first-year quota by 125% across 20+ accounts, differentiating watsonx from Azure OpenAI, AWS Bedrock, and Google Vertex AI, and demoing live at AWS re:Invent to ~400 booth attendees.",
        "Tech-led 2 IBM i RPG-modernization Bobathons for major US trucking firms; both clients purchased Bob, and the reusable 6-phase template spread across Horizon markets.",
      ],
    },
    {
      title: "Software Engineer",
      org: "Qureez",
      when: "Feb 2022 - Apr 2025",
      points: [
        "Built a real-time grid-dispatch integration (80% success under overload) and shipped an RBAC system to AWS Marketplace serving hundreds of accounts; led a 5-person team.",
      ],
    },
    {
      title: "Software Engineer, iOS Profile Team",
      org: "LinkedIn",
      when: "Jun 2022 - Jan 2024",
      points: [
        "Shipped Swift/Obj-C iOS profile features; Top Skills engaged 600K+ members for a ~10% weekly-active lift via LIX A/B tests.",
        "Shipped Career Break (~11% more additions) and Next Best Action prompts (~14% more profile updates), driving the Skills First profile initiative.",
      ],
    },
    {
      title: "Software Developer",
      org: "ALNA Properties",
      when: "Aug 2021 - Dec 2021",
      points: [
        "Shipped a Python/Firebase BI tool over thousands of MLS listings with image-processing AI, cutting outsourcing costs 80%.",
      ],
    },
  ] as ResumeItem[],
  education: [
    {
      title: "Software Engineering Bootcamp",
      org: "Dominican University of California",
      when: "2020",
      points: [],
    },
  ] as ResumeItem[],
};
