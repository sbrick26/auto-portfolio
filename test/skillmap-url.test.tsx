import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SkillMap } from "@/components/skillmap/SkillMap";
import { buildPortfolioGraph } from "@/lib/portfolio-graph";
import { buildNodeUrlMap } from "@/lib/node-url";
import { profile } from "@/content/data";

// The map is ADDRESSABLE: every node has a URL, the back button works, and the
// whole thing is operable from the keyboard. These are the behaviours a visitor
// hits first (share a node, refresh, press back, tab in), so they get their own
// suite alongside the interaction contract in skillmap.test.tsx.

const graph = buildPortfolioGraph();
const urlMap = buildNodeUrlMap(graph);

/** what the browser does on back/forward: swap the URL, then fire popstate */
const goTo = (hash: string) => {
  window.history.replaceState(null, "", `/${hash}`);
  act(() => {
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
};

beforeEach(() => {
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("addressable map", () => {
  it("writes a readable hash for the selected node", () => {
    render(<SkillMap />);
    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    expect(window.location.hash).toBe("#projects");

    fireEvent.click(screen.getByRole("button", { name: "Sterling MCP" }));
    expect(window.location.hash).toBe("#projects/sterling-mcp");
  });

  it("drops the hash entirely when the selection clears", () => {
    render(<SkillMap />);
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(window.location.hash).toBe("#resume");
    fireEvent.click(screen.getByRole("button", { name: "close panel" }));
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/");
  });

  it("boots straight to the node a deep link names, panel open on its row", () => {
    window.history.replaceState(null, "", "/#projects/sterling-mcp");
    const { container } = render(<SkillMap />);

    expect(screen.getByRole("heading", { name: "Projects" })).toBeDefined();
    // the branch is fanned out and the node is on the canvas
    expect(screen.getByRole("button", { name: "Sterling MCP" })).toBeDefined();
    // ...and the panel leads with that row, not the top of the list
    const selectedRow = container.querySelector(".sm-row-on");
    expect(selectedRow?.textContent).toContain("Sterling MCP");
  });

  it("deep-links a sub-skill inside the second layer", () => {
    window.history.replaceState(null, "", "/#skills/mcp-servers");
    const { container } = render(<SkillMap />);
    expect(screen.getByRole("heading", { name: "Skills" })).toBeDefined();
    // the parent group is expanded and the sub-skill chip is the live one
    expect(container.querySelector(".sm-chip-on")?.textContent).toBe("MCP servers");
    expect(container.querySelectorAll(".sm-subleaf").length).toBeGreaterThan(0);
  });

  it("falls back to the home view when the hash addresses nothing", () => {
    window.history.replaceState(null, "", "/#not/a-real-node");
    const { container } = render(<SkillMap />);
    expect(container.querySelector(".sm-panel-open")).toBeNull();
    expect(container.querySelectorAll(".sm-leaf").length).toBe(0);
    // an unreadable address is left alone rather than rewritten under the user
    expect(window.location.hash).toBe("#not/a-real-node");
  });

  it("back restores the previous selection instead of leaving the site", () => {
    render(<SkillMap />);
    fireEvent.click(screen.getByRole("button", { name: "Skills" }));
    fireEvent.click(screen.getByRole("button", { name: "Core Stack" }));
    expect(window.location.hash).toBe("#skills/core-stack");

    goTo("#skills");
    expect(screen.getByRole("heading", { name: "Skills" })).toBeDefined();
    expect(document.querySelector(".sm-row-on")).toBeNull();

    // and back once more closes the panel while staying on the page
    goTo("");
    expect(document.querySelector(".sm-panel-open")).toBeNull();
  });

  it("does not push a history entry for a selection that came from history", () => {
    render(<SkillMap />);
    const push = vi.spyOn(window.history, "pushState");
    goTo("#contact");
    expect(screen.getByRole("heading", { name: "Contact" })).toBeDefined();
    expect(push).not.toHaveBeenCalled();
  });

  it("copies a link to the selected node from the panel header", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<SkillMap />);
    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    fireEvent.click(screen.getByRole("button", { name: "Sterling MCP" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "copy a link to this node" }));
    });

    // a whole, pasteable URL - not just the fragment
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/#${urlMap.slugById["project-3"]}`,
    );
    expect(screen.getByRole("button", { name: "link copied" })).toBeDefined();
  });
});

describe("keyboard navigation", () => {
  const focused = () => document.activeElement as HTMLElement;

  it("arrow keys walk the branch ring and wrap around", () => {
    render(<SkillMap />);
    const about = screen.getByRole("button", { name: "About" });
    about.focus();

    fireEvent.keyDown(about, { key: "ArrowRight" });
    expect(focused().getAttribute("aria-label")).toBe(graph.branches[1].label);

    fireEvent.keyDown(focused(), { key: "ArrowLeft" });
    expect(focused().getAttribute("aria-label")).toBe("About");

    // left from the first branch wraps to the last
    fireEvent.keyDown(focused(), { key: "ArrowLeft" });
    expect(focused().getAttribute("aria-label")).toBe(
      graph.branches[graph.branches.length - 1].label,
    );
  });

  it("walks the hierarchy: up to the card, down into what is fanned out", () => {
    render(<SkillMap />);
    const skills = screen.getByRole("button", { name: "Skills" });
    skills.focus();

    // nothing is fanned out yet, so down does not move
    fireEvent.keyDown(skills, { key: "ArrowDown" });
    expect(focused().getAttribute("aria-label")).toBe("Skills");

    // open the branch, then descend into its fan and back up again
    fireEvent.click(skills);
    fireEvent.keyDown(skills, { key: "ArrowDown" });
    expect(focused().className).toContain("sm-leaf");
    fireEvent.keyDown(focused(), { key: "ArrowUp" });
    expect(focused().getAttribute("aria-label")).toBe("Skills");

    fireEvent.keyDown(focused(), { key: "ArrowUp" });
    expect(focused().className).toContain("sm-card");
    fireEvent.keyDown(focused(), { key: "ArrowDown" });
    expect(focused().getAttribute("aria-label")).toBe(graph.branches[0].label);
  });

  it("Home returns focus to the center card from anywhere", () => {
    render(<SkillMap />);
    const contact = screen.getByRole("button", { name: "Contact" });
    contact.focus();
    fireEvent.keyDown(contact, { key: "Home" });
    expect(focused().className).toContain("sm-card");
  });

  it("Enter opens the panel and moves focus to its heading", () => {
    render(<SkillMap />);
    const resume = screen.getByRole("button", { name: "Resume" });
    resume.focus();
    fireEvent.keyDown(resume, { key: "Enter" });

    expect(window.location.hash).toBe("#resume");
    expect(focused().className).toContain("sm-panel-title");
    expect(focused().textContent).toBe("Resume");
  });

  it("Escape in the panel closes it and returns focus to the node it came from", () => {
    render(<SkillMap />);
    const resume = screen.getByRole("button", { name: "Resume" });
    resume.focus();
    fireEvent.keyDown(resume, { key: "Enter" });

    fireEvent.keyDown(focused(), { key: "Escape" });
    expect(document.querySelector(".sm-panel-open")).toBeNull();
    expect(focused().getAttribute("aria-label")).toBe("Resume");
    expect(window.location.hash).toBe("");
  });

  it("Escape on a node closes the panel without leaving the map", () => {
    render(<SkillMap />);
    const projects = screen.getByRole("button", { name: "Projects" });
    fireEvent.click(projects);
    projects.focus();
    fireEvent.keyDown(projects, { key: "Escape" });
    expect(document.querySelector(".sm-panel-open")).toBeNull();
    expect(window.location.hash).toBe("");
  });

  it("Escape closes the video lightbox without taking the panel with it", () => {
    const { baseElement } = render(<SkillMap />);
    fireEvent.click(screen.getByRole("button", { name: profile.name }));
    const play = screen.getByRole("button", { name: /See it in action/ });
    fireEvent.click(play);
    expect(baseElement.querySelector(".sm-vmodal")).not.toBeNull();

    // the lightbox opens from inside the panel, so Escape reaches both: only
    // the video may act on it
    fireEvent.keyDown(play, { key: "Escape" });
    expect(baseElement.querySelector(".sm-vmodal")).toBeNull();
    expect(baseElement.querySelector(".sm-panel-open")).not.toBeNull();
    expect(window.location.hash).toBe("#me");

    // with the video gone, Escape closes the panel as usual
    fireEvent.keyDown(screen.getByRole("button", { name: "close panel" }), { key: "Escape" });
    expect(baseElement.querySelector(".sm-panel-open")).toBeNull();
  });

  it("returns focus to the owning branch when the node itself folded away", () => {
    render(<SkillMap />);
    fireEvent.click(screen.getByRole("button", { name: "Projects" }));
    const leaf = screen.getByRole("button", { name: "Sterling MCP" });
    leaf.focus();
    fireEvent.keyDown(leaf, { key: "Enter" });
    // closing folds the whole branch back in, so the leaf is gone
    fireEvent.keyDown(focused(), { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Sterling MCP" })).toBeNull();
    expect(focused().getAttribute("aria-label")).toBe("Projects");
  });
});
