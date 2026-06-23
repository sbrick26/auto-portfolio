// Pure helper behind the `skills` tree: connects each skill category to the REAL
// projects that used it. Recruiters distrust self-asserted proficiency
// percentages; what they trust is years and projects. Every project already
// carries a `stack[]`, so the proof is already in the data - this maps those
// stack tokens onto the skill taxonomy and emits a bipartite graph (skills on one
// side, projects on the other) that the tree lights up and branches out on tap.
//
// Deterministic by design (same projects -> same graph) so it is unit-testable
// like buildSkillEvidence, and the render never drifts. The render layer lives in
// components/terminal/outputs.tsx (SkillTree).

import { skills, projects, type Project } from "@/content/data";

// Explicit, tested stack-token -> skill-category map. This IS the proof-to-skill
// seam, mirroring TAG_CATEGORY in lib/activity.ts: every token a project lists in
// its `stack[]` binds to exactly one skill category here, so a project lights up
// the right skills and a skill counts the right projects. An unmapped token is
// intentionally ignored (it draws no edge) rather than bucketed somewhere wrong.
// A graph test asserts every token the live projects use lands here, so adding a
// stack token to a project without mapping it fails the build, by design.
export const STACK_CATEGORY: Record<string, string> = {
  // languages + core: the languages, runtimes, web frameworks, and databases
  "Next.js": "languages + core",
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

  // ai / agents: agent runtimes, MCP, governance frameworks, and eval tooling
  MCP: "ai / agents",
  "watsonx Orchestrate": "ai / agents",
  "Claude Code": "ai / agents",
  AIDLC: "ai / agents",
  "policy-as-code": "ai / agents",
  "NIST / FedRAMP": "ai / agents",
  semgrep: "ai / agents",
  pytest: "ai / agents",

  // cloud + data: cloud + deploy, containers, auth, and the enterprise systems
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
  "LucidLink SDK": "cloud + data",
  "CI gate": "cloud + data",
};

// The skill category a single stack token proves, or undefined if unmapped.
export function categoryForStack(token: string): string | undefined {
  return STACK_CATEGORY[token];
}

// One skill node (left side of the constellation): the category, its accent, the
// individual skill names under it, and the indices of every project that used it.
export type SkillGraphSkill = {
  category: string;
  accent: string;
  items: string[]; // the skill names in this category (for a quiet sub-label)
  projects: number[]; // indices into projects[], in projects[] order
};

// One project node (right side): its index, name, status, optional link, and the
// skill categories it touches (in skills[] order).
export type SkillGraphProject = {
  index: number;
  name: string;
  status: Project["status"];
  link?: string;
  categories: string[];
};

// A single connection between a skill category and a project.
export type SkillGraphEdge = { category: string; project: number };

export type SkillGraph = {
  skills: SkillGraphSkill[]; // only categories with >=1 connected project
  projects: SkillGraphProject[]; // only projects with >=1 mapped stack token
  edges: SkillGraphEdge[];
};

/**
 * Build the bipartite skill<->project graph from each project's `stack[]`.
 *
 * For every project, its stack tokens are mapped to skill categories (deduped per
 * project) and an edge is drawn to each. Skill categories with no connected
 * project are dropped (a category nothing in the portfolio used would render as a
 * dead node); projects whose every token is unmapped are dropped too. Everything
 * stays in skills[] / projects[] order so the layout is stable and testable.
 */
export function buildSkillGraph(projectList: Project[] = projects): SkillGraph {
  const accentFor = new Map(skills.map((g) => [g.category, g.accent]));
  const itemsFor = new Map(skills.map((g) => [g.category, g.items.map((s) => s.name)]));
  const orderFor = new Map(skills.map((g, i) => [g.category, i]));

  const skillProjects = new Map<string, number[]>();
  const edges: SkillGraphEdge[] = [];
  const projectNodes: SkillGraphProject[] = [];

  projectList.forEach((p, index) => {
    const seen = new Set<string>();
    for (const token of p.stack) {
      const category = STACK_CATEGORY[token];
      if (!category) continue;
      seen.add(category);
    }
    if (!seen.size) return;

    const categories = [...seen].sort(
      (a, b) => (orderFor.get(a) ?? 0) - (orderFor.get(b) ?? 0),
    );
    projectNodes.push({
      index,
      name: p.name,
      status: p.status,
      link: p.link,
      categories,
    });
    for (const category of categories) {
      if (!skillProjects.has(category)) skillProjects.set(category, []);
      skillProjects.get(category)!.push(index);
      edges.push({ category, project: index });
    }
  });

  const skillNodes: SkillGraphSkill[] = skills
    .filter((g) => skillProjects.has(g.category))
    .map((g) => ({
      category: g.category,
      accent: accentFor.get(g.category) ?? g.accent,
      items: itemsFor.get(g.category) ?? [],
      projects: skillProjects.get(g.category) ?? [],
    }));

  return { skills: skillNodes, projects: projectNodes, edges };
}
