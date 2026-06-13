// Pure helper behind `skills --activity`: turns the tagged, dated updates feed
// (content/updates.json) into a GitHub-contribution-style heatmap of real
// momentum - which skill category is hot right now versus dormant. No fabricated
// numbers: every cell counts actual updates in that category on that day.
//
// Deterministic by design (same updates + same `now` -> same grid) so it is
// unit-testable and the render never drifts. The render layer lives in
// components/terminal/outputs.tsx (ActivityGrid).

import { skills, type Update } from "@/content/data";

// Explicit, tested tag -> skill-category map. Every tag the feed uses must land
// in exactly one category so the grid is complete and deterministic; an unmapped
// tag is intentionally ignored (it contributes to no category) rather than
// silently bucketed somewhere wrong. Keep this in sync with the feed's tags.
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

export type ActivityRow = {
  category: string;
  accent: string;
  counts: number[]; // raw update count per time bucket
  intensities: number[]; // 0-4, scaled against the busiest bucket in the grid
  total: number;
};

export type ActivityGrid = {
  bucketLabels: string[]; // "MM-DD" per column, oldest -> newest
  rows: ActivityRow[]; // one per skill category, in skills[] order
  max: number; // busiest single bucket (>= 1), the intensity-4 reference
};

const MS_PER_DAY = 86_400_000;

// Whole-day number in UTC for a "YYYY-MM-DD" string, so day math never trips
// over local timezones or DST.
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function isoFromDayNumber(n: number): string {
  const dt = new Date(n * MS_PER_DAY);
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${m}-${d}`;
}

// Local "YYYY-MM-DD" for a Date - what the visitor's calendar reads as "today".
export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// Scale a raw count to a 0-4 intensity step against the busiest bucket. 0 stays
// 0 (truly dormant); anything non-zero is at least 1 so faint activity still shows.
function intensity(count: number, max: number): number {
  if (count <= 0) return 0;
  return Math.max(1, Math.round((count / max) * 4));
}

/**
 * Build the category x day heatmap.
 *
 * Columns span the last `windowDays` days up to (and including) `nowIso`, but
 * never start earlier than the first update - so a young feed shows no dead
 * leading columns, while a long-lived feed slides to a fixed recent window.
 */
export function buildActivity(
  feed: Update[],
  nowIso: string,
  windowDays = 14,
): ActivityGrid {
  const today = dayNumber(nowIso);

  const updateDays = feed
    .map((u) => dayNumber(u.date))
    .filter((n) => n <= today);
  const earliest = updateDays.length ? Math.min(...updateDays) : today;

  const start = Math.max(today - (windowDays - 1), earliest);
  const cols = today - start + 1;

  const bucketLabels = Array.from({ length: cols }, (_, i) =>
    isoFromDayNumber(start + i).slice(5),
  );

  // category -> per-column counts, seeded for every category so dormant ones
  // (e.g. languages) still render as an all-empty row.
  const countsByCategory = new Map<string, number[]>(
    skills.map((g) => [g.category, new Array<number>(cols).fill(0)]),
  );

  for (const u of feed) {
    const category = u.tag ? TAG_CATEGORY[u.tag] : undefined;
    if (!category) continue;
    const col = dayNumber(u.date) - start;
    if (col < 0 || col >= cols) continue;
    const row = countsByCategory.get(category);
    if (row) row[col] += 1;
  }

  let max = 0;
  for (const counts of countsByCategory.values()) {
    for (const c of counts) if (c > max) max = c;
  }
  const safeMax = Math.max(1, max);

  const rows: ActivityRow[] = skills.map((g) => {
    const counts = countsByCategory.get(g.category)!;
    return {
      category: g.category,
      accent: g.accent,
      counts,
      intensities: counts.map((c) => intensity(c, safeMax)),
      total: counts.reduce((s, c) => s + c, 0),
    };
  });

  return { bucketLabels, rows, max: safeMax };
}
