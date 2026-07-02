import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SkillMap } from "@/components/skillmap/SkillMap";
import { buildPortfolioGraph } from "@/lib/portfolio-graph";
import { profile, updates } from "@/content/data";

afterEach(cleanup);

// Interaction contract for the skill-map homepage: the accordion (tiles fan
// out and fold back), the center card's own panel, per-branch panel content
// (including the resume PDF/copy take-aways), and project <-> skill jumps.

const graph = buildPortfolioGraph();

const clickBranch = (label: string) =>
  fireEvent.click(screen.getByRole("button", { name: label }));

describe("SkillMap", () => {
  it("renders the card and all eight branch tiles", () => {
    render(<SkillMap />);
    expect(screen.getByRole("button", { name: profile.name })).toBeDefined();
    for (const b of graph.branches) {
      expect(screen.getByRole("button", { name: b.label })).toBeDefined();
    }
  });

  it("fans a branch's leaves out on tap and folds them back on the second tap", () => {
    render(<SkillMap />);
    expect(screen.queryByRole("button", { name: "AI & Agents" })).toBeNull();
    clickBranch("Skills");
    expect(screen.getByRole("button", { name: "AI & Agents" })).toBeDefined();
    clickBranch("Skills");
    expect(screen.queryByRole("button", { name: "AI & Agents" })).toBeNull();
  });

  it("only one branch's leaves are on the canvas at a time", () => {
    const { container } = render(<SkillMap />);
    clickBranch("Skills");
    const skillsLeaves = container.querySelectorAll(".sm-leaf").length;
    expect(skillsLeaves).toBe(graph.branchById.skills.leaves.length);
    clickBranch("Projects");
    expect(container.querySelectorAll(".sm-leaf").length).toBe(
      graph.branchById.projects.leaves.length,
    );
  });

  it("opens the profile panel from the center card and closes it on re-tap", () => {
    render(<SkillMap />);
    fireEvent.click(screen.getByRole("button", { name: profile.name }));
    expect(screen.getByRole("link", { name: /GitHub/ }).getAttribute("href")).toBe(
      profile.links.github,
    );
    expect(screen.getByRole("link", { name: /Email/ }).getAttribute("href")).toBe(
      `mailto:${profile.links.email}`,
    );
    fireEvent.click(screen.getByRole("button", { name: profile.name }));
    expect(screen.queryByRole("link", { name: /GitHub/ })).toBeNull();
  });

  it("keeps the resume take-aways: PDF download and copy-as-text", () => {
    render(<SkillMap />);
    clickBranch("Resume");
    const pdf = screen.getByRole("link", { name: /download the resume as a PDF/i });
    expect(pdf.getAttribute("href")).toBe("/Swayam_Barik_Resume.pdf");
    expect(pdf.getAttribute("download")).toBe("Swayam_Barik_Resume.pdf");
    expect(screen.getByRole("button", { name: /copy resume as plain text/i })).toBeDefined();
  });

  it("changelog is panel-only: version rows, zero canvas leaves", () => {
    const { container } = render(<SkillMap />);
    clickBranch("Changelog");
    expect(container.querySelectorAll(".sm-leaf").length).toBe(0);
    const firstRow = container.querySelector(".sm-rowlist .sm-row-label");
    expect(firstRow?.textContent).toBe(`v${graph.branchById.changelog.versions![0].version}`);
  });

  it("updates panel streams the whole feed, newest first", () => {
    const { container } = render(<SkillMap />);
    clickBranch("Updates");
    const rows = container.querySelectorAll(".sm-feed-when");
    expect(rows.length).toBe(updates.length);
    expect(rows[0].textContent).toContain(updates[updates.length - 1].date);
  });

  it("pipeline panel walks the run with its real latest version", () => {
    const { container } = render(<SkillMap />);
    clickBranch("Pipeline");
    expect(screen.getByText(new RegExp(`latest v${graph.branchById.pipeline.run!.version}`)))
      .toBeDefined();
    expect(container.querySelectorAll(".sm-flowlist .sm-row").length).toBe(
      graph.branchById.pipeline.flow!.length,
    );
  });

  it("expands a leaf's detail in the panel and cross-jumps project -> skill", () => {
    const { container } = render(<SkillMap />);
    clickBranch("Projects");
    fireEvent.click(screen.getByRole("button", { name: "Agent Pipeline" }));
    expect(screen.getByText("skills used")).toBeDefined();
    expect(container.querySelector(".sm-row-on")).not.toBeNull();

    // jump through the first skill chip: the skills branch fans out instead
    const chip = container.querySelector(".sm-chip-jump") as HTMLElement;
    expect(chip).not.toBeNull();
    fireEvent.click(chip);
    expect(screen.getByRole("heading", { name: "Skills" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Core Stack" })).toBeDefined();
  });

  it("a skill group leaf fans out its sub-skill web with project proof", () => {
    const { container } = render(<SkillMap />);
    clickBranch("Skills");
    fireEvent.click(screen.getByRole("button", { name: "Core Stack" }));
    // second layer on the canvas (the name also appears as a panel chip, so
    // pick the canvas node explicitly)
    const python = screen
      .getAllByRole("button", { name: "Python" })
      .find((el) => el.className.includes("sm-subleaf")) as HTMLElement;
    expect(python).toBeDefined();
    // tapping a sub-skill shows the projects that prove it in the panel (the
    // group row shows its own "proven in" list too, hence getAll)
    fireEvent.click(python);
    expect(screen.getAllByText("proven in").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByRole("button", { name: "Python" }).some((el) =>
        el.className.includes("sm-chip-on"),
      ),
    ).toBe(true);
    expect(container.querySelectorAll(".sm-subleaf").length).toBe(
      graph.subLeavesByParent["skill-0"].length,
    );
  });

  it("changelog folds history behind a show-all expander", () => {
    const { container } = render(<SkillMap />);
    clickBranch("Changelog");
    const total = graph.branchById.changelog.versions!.length;
    expect(container.querySelectorAll(".sm-rowlist .sm-row").length).toBe(Math.min(6, total));
    if (total > 6) {
      fireEvent.click(screen.getByRole("button", { name: `show all ${total} versions` }));
      expect(container.querySelectorAll(".sm-rowlist .sm-row").length).toBe(total);
    }
  });

  it("selecting a row in the panel highlights it in place", () => {
    const { container } = render(<SkillMap />);
    clickBranch("Skills");
    const row = Array.from(container.querySelectorAll(".sm-row-btn")).find((el) =>
      el.textContent?.includes("Core Stack"),
    ) as HTMLElement;
    fireEvent.click(row);
    expect(row.closest(".sm-row")?.className).toContain("sm-row-on");
  });

  it("offers recenter and zoom controls", () => {
    render(<SkillMap />);
    fireEvent.click(screen.getByRole("button", { name: /zoom in/i }));
    fireEvent.click(screen.getByRole("button", { name: /zoom out/i }));
    fireEvent.click(screen.getByRole("button", { name: /recenter/i }));
    expect(screen.getByRole("button", { name: /recenter/i })).toBeDefined();
  });

  it("pans on background drag and deselects on a clean background tap", () => {
    const { container } = render(<SkillMap />);
    clickBranch("Skills");
    expect(screen.getByRole("button", { name: "AI & Agents" })).toBeDefined();
    const stage = container.querySelector(".sm-stage") as HTMLElement;

    // a drag (moved > 4px) pans and does NOT deselect
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(stage, { pointerId: 1, clientX: 60, clientY: 40 });
    fireEvent.pointerUp(stage, { pointerId: 1 });
    expect(screen.getByRole("button", { name: "AI & Agents" })).toBeDefined();

    // a motionless tap folds the accordion back in
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(stage, { pointerId: 2 });
    expect(screen.queryByRole("button", { name: "AI & Agents" })).toBeNull();
  });

  it("two pointers pinch-zoom without deselecting", () => {
    const { container } = render(<SkillMap />);
    clickBranch("Skills");
    const stage = container.querySelector(".sm-stage") as HTMLElement;
    fireEvent.pointerDown(stage, { pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(stage, { pointerId: 2, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(stage, { pointerId: 2, clientX: 300, clientY: 100 });
    fireEvent.pointerUp(stage, { pointerId: 2 });
    fireEvent.pointerUp(stage, { pointerId: 1 });
    // the pinch is never read as a tap: the fan stays open
    expect(screen.getByRole("button", { name: "AI & Agents" })).toBeDefined();
  });
});
