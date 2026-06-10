// Seed content for the terminal site.
// PLACEHOLDER values are marked TODO. Phase 3 wires this to the live career corpus,
// so the work feed and resume stay in sync and never drift.

import updatesJson from "./updates.json";
import changelogJson from "./changelog.json";

export const profile = {
  name: "Swayam Barik",
  handle: "swayam",
  role: "AI Solutions Engineer @ IBM",
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

// Comprehensive on purpose: languages, AI/agents, web/mobile, cloud/devops,
// and the leadership/delivery track (startup PM + enterprise technical sales).
export const skills: SkillGroup[] = [
  {
    category: "ai / agents",
    accent: "var(--color-term-orange)",
    items: [
      { name: "IBM Bob", level: 93 },
      { name: "watsonx Orchestrate", level: 90 },
      { name: "Agentic systems", level: 88 },
      { name: "MCP servers", level: 86 },
      { name: "RAG / LangChain", level: 80 },
    ],
  },
  {
    category: "languages",
    accent: "var(--color-term-blue)",
    items: [
      { name: "TypeScript / JS", level: 90 },
      { name: "Python", level: 85 },
      { name: "Swift / Obj-C", level: 78 },
      { name: "SQL", level: 74 },
    ],
  },
  {
    category: "web / mobile",
    accent: "var(--color-term-purple)",
    items: [
      { name: "React / Next.js", level: 88 },
      { name: "Node / Express / GraphQL", level: 82 },
      { name: "iOS (UIKit)", level: 78 },
      { name: "PWA", level: 76 },
    ],
  },
  {
    category: "cloud / devops",
    accent: "var(--color-term-green)",
    items: [
      { name: "AWS (deploy + Marketplace)", level: 82 },
      { name: "CI / CD pipelines", level: 80 },
      { name: "Docker", level: 76 },
      { name: "MongoDB / Firebase", level: 76 },
      { name: "OAuth 2.0 / OpenAPI", level: 78 },
    ],
  },
  {
    category: "leadership / delivery",
    accent: "var(--color-term-cyan)",
    items: [
      { name: "POC design + technical sales", level: 92 },
      { name: "Agile / sprint leadership", level: 86 },
      { name: "Product (PRDs, JIRA, Confluence)", level: 82 },
      { name: "A/B experimentation", level: 78 },
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
    name: "email triage agent",
    blurb:
      "Agent for a national beverage manufacturer drowning in 2-3K EDI alert emails a day: classifies by severity, files into priority folders, fires Teams alerts on criticals. Won a platform bakeoff vs Copilot Studio.",
    stack: ["watsonx Orchestrate", "Python", "Microsoft Graph", "OAuth 2.0"],
    status: "shipped",
  },
  {
    name: "enterprise HR agent",
    blurb:
      "HR agent for a global sports entertainment company: new-hire and promotion workflows end to end across live Workday and ServiceNow tenants, with compensation checks against internal banding policy before any change.",
    stack: ["watsonx Orchestrate", "Workday", "ServiceNow", "OpenAPI"],
    status: "shipped",
  },
  {
    name: "IBM i modernization MCP server",
    blurb:
      "Secure MCP server that lets an AI agent pull, compile, run, and debug legacy RPG on a live IBM i over SSH: write allowlists, blocked destructive ops, safe bindings. Demoed to major transport and logistics companies; two adopted the product.",
    stack: ["TypeScript", "MCP", "IBM i", "RPG", "Db2"],
    status: "shipped",
  },
  {
    name: "data cleansing agent",
    blurb:
      "AI-readiness demo for a state government agency: an agent that finds and fixes quality issues in citizen records through a least-privilege MCP server, fully container-isolated for security review.",
    stack: ["Node.js", "MCP", "Informix", "Docker"],
    status: "shipped",
  },
  {
    name: "bobwork: agent council UI",
    blurb:
      "Web app for an AI coding CLI with a council mode: 5 parallel agent instances answer, peer-review each other, and a chairman synthesizes the result. Full automated test pipeline gating every merge.",
    stack: ["Next.js", "Node.js", "SQLite", "WebSockets"],
    status: "shipped",
  },
  {
    name: "agent-driven SDLC demo",
    blurb:
      "Full lifecycle automation: an agent picks up a Jira ticket, drafts before/after designs in Figma, implements after approval, iterates until the build matches the design, and opens a PR through CI. Jira, Figma, and GitHub each wired up as custom MCP servers.",
    stack: ["React", "Node.js", "MCP", "Jira", "Figma", "CI/CD"],
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
    "AI Solutions Engineer at IBM with a full-stack engineering background across iOS at LinkedIn, energy-tech startups, and enterprise AI. Designs proof-of-concept systems and multi-agent pipelines that turn business problems into shipped software.",
  experience: [
    {
      title: "AI Solutions Engineer, Horizon West Market",
      org: "IBM, Client Engineering",
      when: "Jan 2026 - Present",
      points: [
        "Own end-to-end technical strategy across 116 enterprise accounts in the western US, spanning tech, finance, government, healthcare, gaming, and manufacturing.",
        "Design and ship enterprise agent POCs end to end: email triage on watsonx Orchestrate that won a bakeoff vs Copilot Studio, and an HR agent running live against Workday and ServiceNow tenants that moved straight to pricing.",
        "Built secure MCP servers that let AI agents modernize legacy RPG on live IBM i systems (write allowlists, SSH tunneling, blocked destructive ops); two major logistics companies adopted the product after demos.",
        "Created and led a full-day enterprise hackathon series as tech lead; the reusable template is now used across multiple markets and drove adoption with hundreds of client engineers.",
      ],
    },
    {
      title: "Brand Technical Specialist, Data and AI",
      org: "IBM",
      when: "Mar 2025 - Jan 2026",
      points: [
        "Exceeded first-year quota by 125% owning technical evaluations end-to-end across 20+ medium and large enterprise accounts.",
        "Designed and presented a live watsonx demo at AWS re:Invent, generating hundreds of inbound conversations and new pipeline opportunities.",
      ],
    },
    {
      title: "Software Engineer",
      org: "Qureez",
      when: "Feb 2022 - Apr 2025",
      points: [
        "Delivered full-stack web, mobile, and IoT platforms for energy startups (TypeScript, React, Next.js, Node, AWS, MongoDB) managing consumption across large commercial buildings.",
        "Built an ERCOT API integration hitting an 80% success rate during grid overload events; shipped an RBAC system to AWS Marketplace serving hundreds of accounts.",
        "Led daily standups and sprint planning for a 5-person offshore team; PWA migration lifted mobile usage roughly 50%.",
      ],
    },
    {
      title: "Software Engineer, iOS Profile Team",
      org: "LinkedIn",
      when: "Jun 2022 - Jan 2024",
      points: [
        "Shipped user-facing iOS features for the core profile: Top Skills (600K+ members engaged, ~10% WAU lift), Career Break Associations (~11% lift), Next Best Action prompts (~14% more profile updates).",
        "Built reusable API-driven UI components adopted across multiple profile sections; led A/B experiment design with LIX and T-REX.",
      ],
    },
    {
      title: "Software Developer",
      org: "ALNA Properties",
      when: "Aug 2021 - Dec 2021",
      points: [
        "Built a Python + Firebase BI tool analyzing thousands of MLS listings daily with image-processing AI; cut outsourcing costs 80% by automating manual review.",
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
