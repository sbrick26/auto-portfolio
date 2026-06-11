import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook, cleanup } from "@testing-library/react";

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
