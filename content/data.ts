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
  "I'm an AI Solutions Engineer at IBM in San Francisco, where I design and lead custom proof-of-concept engagements across a portfolio of 116 enterprise accounts: production-grade agents on watsonx Orchestrate, secure MCP servers for legacy modernization, and full-day enterprise hackathons that turn evaluations into adoptions.",
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
      { name: "Agent orchestration (watsonx Orchestrate, Agent SDK)", level: 90 },
      { name: "MCP servers (build + harden)", level: 88 },
      { name: "LLM APIs + prompt engineering", level: 88 },
      { name: "Evals + bake-offs", level: 84 },
      { name: "RAG / LangGraph", level: 80 },
      { name: "IBM Bob / watsonx Code Assistant", level: 90 },
    ],
  },
  {
    category: "cloud + data",
    accent: "var(--color-term-green)",
    items: [
      { name: "AWS (deploy + Marketplace)", level: 82 },
      { name: "OAuth 2.0 / OpenAPI integrations", level: 86 },
      { name: "Microsoft Graph / Workday / ServiceNow", level: 82 },
      { name: "Docker + CI/CD", level: 80 },
      { name: "MongoDB / Firebase / Informix", level: 76 },
    ],
  },
  {
    category: "customer-facing",
    accent: "var(--color-term-cyan)",
    items: [
      { name: "POC design + deployment ownership", level: 92 },
      { name: "Technical scoping + discovery", level: 88 },
      { name: "Stakeholder management (exec + eng)", level: 86 },
      { name: "Competitive displacement + ROI", level: 86 },
      { name: "Tech lead / team + intern leadership", level: 84 },
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
      "This site. A multi-agent system that ships its own daily improvements: front agent on Telegram, per-project leads and workers, PRs to GitHub, CI gates, deploy to AWS via SST.",
    stack: ["Next.js", "TypeScript", "Claude Code", "SST", "AWS"],
    status: "building",
    link: "https://github.com/sbrick26/auto-portfolio",
  },
  {
    name: "IBM i modernization MCP server",
    blurb:
      "I built and hardened the MCP server that lets an AI agent pull, compile, run, and debug legacy RPG on a live IBM i over SSH: write allowlists, blocked destructive ops, driver-escaped bindings, env-loaded creds. Designed to survive enterprise security review; two major transport and logistics companies adopted the product after the demo.",
    stack: ["TypeScript", "MCP", "IBM i / RPG", "Db2", "SSH"],
    status: "shipped",
  },
  {
    name: "end-to-end RPG modernization demo (Bob 2.0)",
    blurb:
      "I built a demo that drove an agent fully autonomously over a live IBM i: business-rule extraction on a single 10,000+ line legacy file, parallel tool calls, fixed-to-free RPG modernization, then compile-run-test on the box. Demoed to a state public pension fund now in purchase conversations; rolling into the hackathon circuit.",
    stack: ["IBM Bob 2.0", "MCP", "IBM i / RPG", "Db2"],
    status: "shipped",
  },
  {
    name: "enterprise HR agent",
    blurb:
      "I designed and built a watsonx Orchestrate HR agent for a global sports entertainment company, running live against real Workday and ServiceNow tenants inside a custom portal. A two-layer architecture (reusable app integrations + use-case orchestrators) handles job changes, promotion letters, and compensation checks against banding policy before any write. Moved the account to pricing and deployment.",
    stack: ["watsonx Orchestrate", "Workday", "ServiceNow", "OAuth 2.0", "OpenAPI"],
    status: "shipped",
  },
  {
    name: "email triage agent",
    blurb:
      "I shipped an agent for a national beverage manufacturer drowning in 2,000-3,000 EDI alert emails a day: an LLM classifies each by severity, files it into priority folders, and fires Teams alerts on the ~1% critical. Secured Graph access via OAuth 2.0 delegated scopes. Won the platform bake-off vs Copilot Studio.",
    stack: ["watsonx Orchestrate", "Python", "Microsoft Graph", "OAuth 2.0"],
    status: "shipped",
  },
  {
    name: "data cleansing agent",
    blurb:
      "An AI-readiness demo for a state government agency: an agent that finds and fixes quality issues in citizen records through a least-privilege MCP server, fully container-isolated for security review.",
    stack: ["Node.js", "MCP", "Informix", "Docker"],
    status: "shipped",
  },
  {
    name: "trading-bot",
    blurb: "Algorithmic trading experiments. Next project the agent pipeline will manage.", // TODO confirm wording with user
    stack: ["Python"],
    status: "building",
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
    "AI Solutions Architect and forward-deployed engineer who owns enterprise agent deployments end to end across a portfolio of 116 accounts: from stakeholder discovery to security-hardened MCP servers running live in production. I turn stalled POCs into adoptions and codify the wins into reusable frameworks other teams reuse. Exceeded first-year quota by 125%.",
  experience: [
    {
      title: "AI Solutions Engineer, Horizon West Market",
      org: "IBM, Client Engineering",
      when: "Jan 2026 - Present",
      points: [
        "I own technical strategy across 116 enterprise accounts in the western US, scoping and leading 4-to-6-week agent POCs across tech, finance, government, healthcare, gaming, and manufacturing.",
        "I architected a security-hardened MCP server (write allowlists, blocked destructive ops, SSH-tunneled, driver-escaped bindings) that lets an AI agent modernize legacy RPG on live IBM i; it cleared enterprise security review and two major transport and logistics companies bought the product.",
        "I built a watsonx Orchestrate HR agent running live against real Workday and ServiceNow tenants for a global sports entertainment company, secured via OAuth 2.0 and OpenAPI tool contracts; it moved the account straight to pricing and deployment.",
        "I shipped an Orchestrate email-triage agent over a client mailbox taking 2,000-3,000 EDI alerts a day, LLM-classifying the ~1% critical and routing Teams alerts; it won the platform bake-off against Microsoft Copilot Studio.",
        "I conceived and ran a full-day enterprise hackathon series as tech lead and productized it into a reusable 6-phase template; 10 events run to date at ~15-20 engineers each, the template adopted across multiple markets and two clients buying after theirs.",
        "I founded and lead a cross-org initiative, directing 5 interns to build a reusable, guardrailed library of agent skills, modes, and MCP servers spanning 10+ IBM products to accelerate POC delivery.",
      ],
    },
    {
      title: "Brand Technical Specialist, Data and AI",
      org: "IBM",
      when: "Mar 2025 - Jan 2026",
      points: [
        "I exceeded first-year quota by 125%, owning technical evaluations end to end across 20+ enterprise accounts and differentiating watsonx from Azure OpenAI, AWS Bedrock, and Google Vertex AI.",
        "I built repeatable, client-specific demo frameworks mapping business pain to quantifiable watsonx outcomes, cutting time-to-close across the territory.",
      ],
    },
    {
      title: "Software Engineer",
      org: "Qureez",
      when: "Feb 2022 - Apr 2025",
      points: [
        "I delivered full-stack web, mobile, and IoT energy platforms (TypeScript, React, Next.js, Node, AWS, MongoDB) and led a 5-person offshore team through standups and sprint planning.",
        "I engineered a real-time grid-dispatch integration hitting an 80% success rate during overload events and shipped an RBAC system to AWS Marketplace serving hundreds of accounts.",
      ],
    },
    {
      title: "Software Engineer, iOS Profile Team",
      org: "LinkedIn",
      when: "Jun 2022 - Jan 2024",
      points: [
        "I shipped iOS profile features in Swift and Objective-C: Top Skills (600K+ members engaged, ~10% weekly-active lift), Career Break (~11% more additions), Next Best Action (~14% more profile updates), run with LIX/T-REX A/B experiments.",
      ],
    },
    {
      title: "Software Developer",
      org: "ALNA Properties",
      when: "Aug 2021 - Dec 2021",
      points: [
        "I built a Python and Firebase BI tool analyzing thousands of MLS listings daily with image-processing AI, cutting outsourcing costs 80% by automating manual review.",
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
