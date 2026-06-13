// Pure helper behind `skills --activity`: turns the tagged, dated updates feed
// (content/updates.json) into per-skill *evidence* - the real work-log entries
// that back each skill category. Tap a skill, read the work that proves it.
//
// This replaced an earlier contribution-style heatmap. A time grid punishes an
// off week (a sparse row reads as "not working"); accumulated evidence only ever
// grows as new tagged updates land, so the signal stays honest and never blanks
// out. Same data seam, kinder framing.
//
// Deterministic by design (same feed -> same evidence) so it is unit-testable and
// the render never drifts. The render layer lives in components/terminal/outputs.tsx
// (SkillActivity).

import { skills, type Update } from "@/content/data";

// Explicit, tested tag -> skill-category map: this IS the evidence-to-skill
// tagging seam. Every update carries a `tag`; that tag binds the update to one
// skill category here, so as new daily updates land they automatically surface
// as evidence under the right skill. Every tag the feed uses must land in
// exactly one category; an unmapped tag is intentionally ignored (it backs no
// skill) rather than silently bucketed somewhere wrong. Keep in sync with the feed.
export const TAG_CATEGORY: Record<string, string> = {
  design: "leadership / delivery",
  infra: "cloud / devops",
  launch: "cloud / devops",
  pipeline: "cloud / devops",
  portfolio: "web / mobile",
  agents: "ai / agents",
  "client-work": "ai / agents",
  "ibm-i": "ai / agents",
};

// One concrete piece of evidence: a single update that backs a skill category.
export type EvidenceItem = {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  text: string;
  tag: string;
};

export type SkillEvidence = {
  category: string;
  accent: string;
  items: EvidenceItem[]; // newest first
  total: number;
  lastActive: string | null; // YYYY-MM-DD of the most recent evidence, or null
};

// Local "YYYY-MM-DD" for a Date - what the visitor's calendar reads as "today".
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Lexical sort key: "YYYY-MM-DD HH:MM" sorts chronologically as a plain string.
function ordinal(u: { date: string; time: string }): string {
  return `${u.date} ${u.time}`;
}

/**
 * Group the updates feed into per-skill evidence.
 *
 * For each skill category (in skills[] order) collect the updates whose tag maps
 * to it, newest first. Categories with no tagged evidence still return a row with
 * empty items, so the skill list stays complete and an off week never erases a
 * skill - it simply shows no logged activity yet.
 */
export function buildSkillEvidence(feed: Update[]): SkillEvidence[] {
  const byCategory = new Map<string, EvidenceItem[]>(
    skills.map((g) => [g.category, []]),
  );

  for (const u of feed) {
    if (!u.tag) continue;
    const category = TAG_CATEGORY[u.tag];
    if (!category) continue;
    const bucket = byCategory.get(category);
    if (bucket) bucket.push({ date: u.date, time: u.time, text: u.text, tag: u.tag });
  }

  return skills.map((g) => {
    const items = (byCategory.get(g.category) ?? [])
      .slice()
      .sort((a, b) => (ordinal(a) < ordinal(b) ? 1 : ordinal(a) > ordinal(b) ? -1 : 0));
    return {
      category: g.category,
      accent: g.accent,
      items,
      total: items.length,
      lastActive: items.length ? items[0].date : null,
    };
  });
}
