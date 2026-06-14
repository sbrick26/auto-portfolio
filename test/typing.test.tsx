import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { renderHook, cleanup, act } from "@testing-library/react";

// Drive framer-motion's reduced-motion preference deterministically. The real
// hook reads matchMedia once and caches it module-globally, which is awkward to
// toggle per-test; mocking it isolates useTyped's own branch. (Vitest only lets
// the hoisted factory reference variables whose names start with "mock".)
const mockMotion = { reduced: false };
vi.mock("framer-motion", () => ({
  useReducedMotion: () => mockMotion.reduced,
}));

import { useTyped } from "@/components/terminal/typing";

afterEach(cleanup);

describe("useTyped reduced-motion", () => {
  it("shows the full text immediately and is done when reduced motion is requested", () => {
    mockMotion.reduced = true;
    const { result } = renderHook(() => useTyped("hello world"));
    expect(result.current.shown).toBe("hello world");
    expect(result.current.done).toBe(true);
  });

  it("starts empty and not-done when motion is allowed (typewriter active)", () => {
    mockMotion.reduced = false;
    const { result } = renderHook(() => useTyped("hello world"));
    expect(result.current.shown).toBe("");
    expect(result.current.done).toBe(false);
  });

  it("respects an explicit enabled=false even without reduced motion", () => {
    mockMotion.reduced = false;
    const { result } = renderHook(() => useTyped("hello world", 16, false));
    expect(result.current.shown).toBe("hello world");
    expect(result.current.done).toBe(true);
  });
});

// Drive the requestAnimationFrame loop deterministically: capture the pending
// frame callback and fire it with explicit timestamps, so we can assert that the
// reveal advances by REAL elapsed time (the property that makes it both honor the
// requested speed and stay smooth) without leaning on wall-clock timers.
describe("useTyped progression", () => {
  let pending: FrameRequestCallback | null = null;

  beforeEach(() => {
    mockMotion.reduced = false;
    pending = null;
    let id = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      pending = cb;
      return ++id;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      pending = null;
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  // Fire the queued frame at `ts`; the callback may re-queue the next one.
  function frame(ts: number) {
    const cb = pending;
    pending = null;
    act(() => cb?.(ts));
  }

  it("reveals more characters as real time elapses, then completes", () => {
    const { result } = renderHook(() => useTyped("hello world", 10)); // 10ms/char
    expect(result.current.shown).toBe("");

    frame(0); // first frame anchors the clock; nothing shown yet
    expect(result.current.shown).toBe("");

    frame(35); // floor(35 / 10) = 3 chars
    expect(result.current.shown).toBe("hel");
    expect(result.current.done).toBe(false);

    frame(110); // floor(110 / 10) = 11 -> the whole 11-char string
    expect(result.current.shown).toBe("hello world");
    expect(result.current.done).toBe(true);
  });

  it("a smaller speed reveals more characters for the same elapsed time", () => {
    const { result } = renderHook(() => useTyped("abcdefghij", 5)); // 5ms/char
    frame(0);
    frame(30); // floor(30 / 5) = 6 chars, vs only 3 at speed 10
    expect(result.current.shown).toBe("abcdef");
  });

  it("stops requesting frames once the text is fully shown", () => {
    const { result } = renderHook(() => useTyped("hi", 10));
    frame(0);
    frame(100); // well past the 20ms the 2-char string needs
    expect(result.current.done).toBe(true);
    expect(pending).toBeNull(); // no further frame queued
  });
});
