import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { BootLoader } from "@/components/terminal/BootLoader";

afterEach(cleanup);

describe("BootLoader", () => {
  it("renders an inert, non-interactive overlay", () => {
    const { container } = render(<BootLoader leaving={false} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute("aria-hidden")).toBe("true");
    // never steals the skip handlers / prompt focus underneath it
    expect(root.className).toContain("pointer-events-none");
    expect(root.className).toContain("fixed");
  });

  it("advances the progress readout and status while holding", () => {
    vi.useFakeTimers();
    try {
      const { getByText } = render(<BootLoader leaving={false} />);
      // starts at the first phase, 0%
      expect(getByText("initializing")).toBeDefined();
      expect(getByText("0%")).toBeDefined();
      act(() => {
        vi.advanceTimersByTime(800);
      });
      // the fill has climbed and the status word moved on with it
      expect(getByText("loading profile")).toBeDefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("jumps straight to a completed, ready state when leaving", () => {
    const { getByText } = render(<BootLoader leaving />);
    expect(getByText("100%")).toBeDefined();
    expect(getByText("ready")).toBeDefined();
  });
});
