// Live proof for the pipeline panel: the repo's most recent merges, pulled
// straight from GitHub's PUBLIC REST API in the browser so a visitor can verify
// the "ships its own improvements daily" claim in one click, instead of trusting
// the hand-curated in-repo changelog.
//
// Everything network-facing is isolated in fetchShipped(); the parsing and the
// relative-time label are pure and unit-tested (same discipline as
// lib/pipeline.ts / lib/activity.ts). On ANY failure - offline, rate-limited
// (unauthenticated REST is 60 req/hr per visitor IP), malformed JSON, empty repo
// - the helpers return an empty list / null and the panel keeps showing the
// static changelog unchanged. No auth, no secrets, no env, no infra.

// The public repo this site ships from. Kept in sync with profile.links in
// content/data.ts by intent, but owned here so the helper is self-contained.
export const FEED_REPO = "sbrick26/auto-portfolio";

// Recent commits on the default branch = the real "last things shipped" (the
// pipeline squash-merges each daily PR to main). per_page is small on purpose:
// one cheap request, well inside the unauthenticated rate limit.
export const FEED_ENDPOINT = `https://api.github.com/repos/${FEED_REPO}/commits?per_page=8`;

// One cache slot per browser SESSION (bumped when the shape changes) so a visit
// makes at most one request no matter how many times the panel opens.
export const FEED_CACHE_KEY = "pipeline-feed:v1";

// The compact fact the panel renders: what shipped, when, and where to verify it.
export type ShippedItem = {
  /** commit subject with the trailing " (#NN)" stripped */
  title: string;
  /** the PR page when the subject carried a number, else the commit page */
  url: string;
  /** ISO-8601 commit timestamp (used for the relative "Xh ago" label) */
  iso: string;
  /** short commit sha */
  sha: string;
  /** the merged PR number if the subject carried one, else null */
  pr: number | null;
};

// Only the fields of the GitHub commits response we actually read.
type RawCommit = {
  sha?: unknown;
  html_url?: unknown;
  commit?: {
    message?: unknown;
    committer?: { date?: unknown };
    author?: { date?: unknown };
  };
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

// Turn one raw commit into a ShippedItem, or null if it lacks the essentials (a
// subject and a valid timestamp). Squash-merge subjects end with "(#NN)"; we
// lift that into a real PR link and drop it from the displayed title.
function toShipped(c: RawCommit): ShippedItem | null {
  const message = asString(c.commit?.message);
  const subject = message.split("\n")[0].trim();
  if (!subject) return null;

  const iso = asString(c.commit?.committer?.date) || asString(c.commit?.author?.date);
  if (!iso || Number.isNaN(Date.parse(iso))) return null;

  const sha = asString(c.sha).slice(0, 7);
  const match = subject.match(/\(#(\d+)\)\s*$/);
  const pr = match ? Number(match[1]) : null;
  const title = match ? subject.slice(0, match.index).trim() : subject;

  const commitUrl = asString(c.html_url);
  const url = pr
    ? `https://github.com/${FEED_REPO}/pull/${pr}`
    : commitUrl || `https://github.com/${FEED_REPO}`;

  return { title: title || subject, url, iso, sha, pr };
}

/**
 * Parse the GitHub commits payload into the compact shipped-items list, newest
 * first (the API already returns that order). Anything non-array or malformed
 * yields an empty list, so a bad response is indistinguishable from "offline"
 * to the caller - both fall back to the static changelog.
 */
export function parseCommits(raw: unknown): ShippedItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ShippedItem[] = [];
  for (const c of raw) {
    const item = toShipped(c as RawCommit);
    if (item) items.push(item);
  }
  return items;
}

/**
 * A short human label for how long ago something shipped ("just now", "12m ago",
 * "3h ago", "2d ago", "5w ago", "3mo ago"). `now` is passed in (not read from
 * the clock) so the function stays pure and testable. A future or unparseable
 * timestamp returns null rather than a nonsense label.
 */
export function relativeShipped(iso: string, now: number): string | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const mins = Math.floor((now - t) / 60000);
  if (mins < 0) return null;
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// Session cache read/write, fully guarded: no window, disabled storage, or bad
// JSON just means "no cache" - never a throw that would break the panel.
function readCache(): ShippedItem[] | null {
  try {
    const raw = window.sessionStorage.getItem(FEED_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ShippedItem[]) : null;
  } catch {
    return null;
  }
}

function writeCache(items: ShippedItem[]): void {
  try {
    window.sessionStorage.setItem(FEED_CACHE_KEY, JSON.stringify(items));
  } catch {
    // storage full or disabled - the feature simply refetches next visit
  }
}

/**
 * Fetch the repo's most recent shipped items, client-side only. Returns the
 * session-cached list when present (one request per visit); otherwise hits the
 * public GitHub REST API, caches a non-empty result, and returns it. Any
 * failure (non-2xx, network error, malformed body) resolves to an empty list so
 * the caller falls back to the static changelog - it never rejects.
 */
export async function fetchShipped(opts?: { signal?: AbortSignal }): Promise<ShippedItem[]> {
  const cached = readCache();
  if (cached) return cached;

  try {
    if (typeof fetch !== "function") return [];
    const res = await fetch(FEED_ENDPOINT, {
      headers: { Accept: "application/vnd.github+json" },
      signal: opts?.signal,
    });
    if (!res.ok) return [];
    const items = parseCommits(await res.json());
    if (items.length) writeCache(items);
    return items;
  } catch {
    return [];
  }
}
