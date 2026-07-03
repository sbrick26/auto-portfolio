import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseCommits,
  relativeShipped,
  fetchShipped,
  FEED_REPO,
  FEED_CACHE_KEY,
} from "@/lib/pipeline-feed";

// A minimal slice of a real GitHub commits payload (only the fields we read).
function commit(message: string, date: string, sha = "abcdef1234567890", url?: string) {
  return {
    sha,
    html_url: url ?? `https://github.com/${FEED_REPO}/commit/${sha}`,
    commit: { message, committer: { date } },
  };
}

describe("parseCommits", () => {
  it("lifts the PR number out of a squash-merge subject and links to the PR", () => {
    const items = parseCommits([commit("v3.0.1: aspect-adaptive map (#72)", "2026-07-01T10:00:00Z")]);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("v3.0.1: aspect-adaptive map");
    expect(items[0].pr).toBe(72);
    expect(items[0].url).toBe(`https://github.com/${FEED_REPO}/pull/72`);
    expect(items[0].sha).toBe("abcdef1");
  });

  it("falls back to the commit page when the subject carries no PR number", () => {
    const url = `https://github.com/${FEED_REPO}/commit/deadbeef`;
    const items = parseCommits([commit("qa: fix regressions visual", "2026-07-02T09:00:00Z", "deadbeef00", url)]);
    expect(items[0].pr).toBeNull();
    expect(items[0].title).toBe("qa: fix regressions visual");
    expect(items[0].url).toBe(url);
  });

  it("keeps only the first line of a multi-line commit message", () => {
    const items = parseCommits([commit("headline change (#5)\n\nbody paragraph\nmore", "2026-07-02T09:00:00Z")]);
    expect(items[0].title).toBe("headline change");
    expect(items[0].pr).toBe(5);
  });

  it("preserves the API order (newest first) and drops nothing valid", () => {
    const items = parseCommits([
      commit("newest (#3)", "2026-07-03T00:00:00Z"),
      commit("older (#2)", "2026-07-02T00:00:00Z"),
    ]);
    expect(items.map((i) => i.pr)).toEqual([3, 2]);
  });

  it("skips commits missing a subject or a valid date", () => {
    const items = parseCommits([
      commit("", "2026-07-03T00:00:00Z"),
      commit("no date", "not-a-date"),
      { commit: {} },
      commit("good (#9)", "2026-07-03T00:00:00Z"),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].pr).toBe(9);
  });

  it("uses the author date when the committer date is absent", () => {
    const items = parseCommits([
      { sha: "f00", html_url: "x", commit: { message: "authored (#1)", author: { date: "2026-07-01T00:00:00Z" } } },
    ]);
    expect(items[0].iso).toBe("2026-07-01T00:00:00Z");
  });

  it("returns an empty list for non-array / malformed input", () => {
    expect(parseCommits(null)).toEqual([]);
    expect(parseCommits({})).toEqual([]);
    expect(parseCommits("nope")).toEqual([]);
  });
});

describe("relativeShipped", () => {
  const base = Date.parse("2026-07-03T12:00:00Z");
  const ago = (ms: number) => new Date(base - ms).toISOString();

  it("labels sub-minute as just now", () => {
    expect(relativeShipped(ago(30 * 1000), base)).toBe("just now");
  });
  it("labels minutes, hours, days, weeks, months, years", () => {
    expect(relativeShipped(ago(12 * 60 * 1000), base)).toBe("12m ago");
    expect(relativeShipped(ago(3 * 60 * 60 * 1000), base)).toBe("3h ago");
    expect(relativeShipped(ago(2 * 24 * 60 * 60 * 1000), base)).toBe("2d ago");
    expect(relativeShipped(ago(10 * 24 * 60 * 60 * 1000), base)).toBe("1w ago");
    expect(relativeShipped(ago(60 * 24 * 60 * 60 * 1000), base)).toBe("2mo ago");
    expect(relativeShipped(ago(400 * 24 * 60 * 60 * 1000), base)).toBe("1y ago");
  });
  it("returns null for a future or unparseable timestamp", () => {
    expect(relativeShipped(ago(-5 * 60 * 1000), base)).toBeNull();
    expect(relativeShipped("garbage", base)).toBeNull();
  });
});

describe("fetchShipped", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it("fetches, parses, and caches a non-empty result for the session", async () => {
    const payload = [commit("v9.9.9: something (#100)", "2026-07-03T11:00:00Z")];
    const spy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, json: async () => payload } as Response);

    const first = await fetchShipped();
    expect(first[0].pr).toBe(100);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(FEED_CACHE_KEY)).toBeTruthy();

    // second call is served from the session cache - no extra request
    const second = await fetchShipped();
    expect(second[0].pr).toBe(100);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("resolves to an empty list (never rejects) on a non-2xx response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 403 } as Response);
    await expect(fetchShipped()).resolves.toEqual([]);
    expect(window.sessionStorage.getItem(FEED_CACHE_KEY)).toBeNull();
  });

  it("resolves to an empty list on a network error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("offline"));
    await expect(fetchShipped()).resolves.toEqual([]);
  });

  it("does not cache an empty parse result", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({ ok: true, json: async () => [] } as Response);
    await expect(fetchShipped()).resolves.toEqual([]);
    expect(window.sessionStorage.getItem(FEED_CACHE_KEY)).toBeNull();
  });
});
