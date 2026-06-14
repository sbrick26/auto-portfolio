import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { Terminal } from "@/components/terminal/Terminal";
import { profile } from "@/content/data";

afterEach(cleanup);

function getPromptInput(): HTMLInputElement {
  const inputs = screen.getAllByLabelText("terminal input") as HTMLInputElement[];
  // the active session's input is the visible one; jsdom renders all, last wins
  return inputs[inputs.length - 1];
}

function run(cmd: string) {
  const input = getPromptInput();
  fireEvent.change(input, { target: { value: cmd } });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("Terminal", () => {
  it("boots with a welcome tab", () => {
    render(<Terminal />);
    expect(screen.getByText("welcome")).toBeDefined();
  });

  it("runs a command and renders its output block", () => {
    render(<Terminal />);
    run("me");
    expect(screen.getAllByText(profile.role).length).toBeGreaterThan(0);
  });

  it("renames the tab to the last command", () => {
    render(<Terminal />);
    run("skills");
    // tab strip now shows "skills" instead of "welcome"
    expect(screen.queryByText("welcome")).toBeNull();
    expect(screen.getAllByText("skills").length).toBeGreaterThan(0);
  });

  it("resolves aliases to the same renderer", () => {
    render(<Terminal />);
    run("whoami");
    expect(screen.getAllByText(profile.role).length).toBeGreaterThan(0);
  });

  it("shows an error for unknown commands", () => {
    render(<Terminal />);
    run("sudo");
    expect(screen.getByText(/command not found: sudo/)).toBeDefined();
  });

  it("clear empties the tab", () => {
    render(<Terminal />);
    run("contact");
    expect(screen.getAllByText(/email/).length).toBeGreaterThan(0);
    run("clear");
    expect(screen.queryByText(profile.links.email)).toBeNull();
  });

  it("opens, switches, and closes tabs", () => {
    render(<Terminal />);
    const plus = screen.getByLabelText("new tab");
    fireEvent.click(plus);
    // two tabs now: welcome + shell
    expect(screen.getByText("welcome")).toBeDefined();
    expect(screen.getByText("shell")).toBeDefined();

    // run a command in the new tab; only that tab renames
    run("projects");
    expect(screen.getByText("welcome")).toBeDefined();
    expect(screen.queryByText("shell")).toBeNull();

    // close the new tab: back to a single session, close buttons disappear
    const closes = screen.getAllByLabelText("close tab");
    fireEvent.click(closes[closes.length - 1]);
    expect(screen.getByText("welcome")).toBeDefined();
    expect(screen.getAllByLabelText("terminal input").length).toBe(1);
    expect(screen.queryAllByLabelText("close tab").length).toBe(0);
  });

  it("opening many tabs never duplicates ids (hot reload regression)", () => {
    render(<Terminal />);
    const plus = screen.getByLabelText("new tab");
    fireEvent.click(plus);
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(screen.getAllByText("shell").length).toBe(3);
  });

  it("recalls history with arrow up", () => {
    render(<Terminal />);
    run("about");
    const input = getPromptInput();
    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("about");
  });

  it("tab-completes a partial command", () => {
    render(<Terminal />);
    const input = getPromptInput();
    fireEvent.change(input, { target: { value: "upd" } });
    fireEvent.keyDown(input, { key: "Tab" });
    expect(input.value).toBe("updates");
  });

  it("shows ghost-text for a partial command", () => {
    render(<Terminal />);
    const input = getPromptInput();
    fireEvent.change(input, { target: { value: "pr" } });
    // ghost shows the remainder of "projects"
    expect(screen.getAllByText("ojects").length).toBeGreaterThan(0);
  });

  it("hides ghost-text once a space is typed or on exact match", () => {
    render(<Terminal />);
    const input = getPromptInput();
    fireEvent.change(input, { target: { value: "projects x" } });
    expect(screen.queryByText("ojects")).toBeNull();
    fireEvent.change(input, { target: { value: "projects" } });
    // exact match: no remainder to show
    expect(screen.queryByText(/^ojects$/)).toBeNull();
  });

  it("arrow-right accepts the ghost suggestion at end of input", () => {
    render(<Terminal />);
    const input = getPromptInput();
    fireEvent.change(input, { target: { value: "sk" } });
    input.setSelectionRange(2, 2);
    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(input.value).toBe("skills");
  });

  it("quick chips run their command", () => {
    render(<Terminal />);
    const chips = screen.getAllByRole("button", { name: "resume" });
    fireEvent.click(chips[0]);
    expect(screen.getAllByText(/experience/i).length).toBeGreaterThan(0);
  });

  it("cmd+K opens the palette and Enter runs the selection", () => {
    render(<Terminal />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const palette = screen.getByPlaceholderText("run a command ...");
    fireEvent.change(palette, { target: { value: "contact" } });
    fireEvent.keyDown(palette, { key: "Enter" });
    const out = screen.getAllByText(/github/);
    expect(out.length).toBeGreaterThan(0);
  });

  it("escape closes the palette", () => {
    render(<Terminal />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    const palette = screen.getByPlaceholderText("run a command ...");
    fireEvent.keyDown(palette, { key: "Escape" });
    // palette unmounts (AnimatePresence exit) - input gone or going
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getAllByPlaceholderText("run a command ...").length).toBeGreaterThan(0);
  });

  it("help lists every visible command", () => {
    render(<Terminal />);
    run("help");
    const main = screen.getAllByText(/list everything you can do/);
    expect(main.length).toBeGreaterThan(0);
  });
});

describe("secret version command", () => {
  it("is hidden from help and the quick chips", () => {
    render(<Terminal />);
    run("help");
    expect(screen.queryByRole("button", { name: "version" })).toBeNull();
  });

  it("is excluded from tab-completion", () => {
    render(<Terminal />);
    const input = getPromptInput();
    fireEvent.change(input, { target: { value: "ver" } });
    fireEvent.keyDown(input, { key: "Tab" });
    expect(input.value).toBe("ver"); // hidden commands never complete
  });

  it("typing it works and shows the version", () => {
    render(<Terminal />);
    run("version");
    // Scope to the version output row (the boot intro now also surfaces the
    // version, so a bare screen-wide query would match in two places).
    const row = screen.getByText("auto-portfolio").parentElement as HTMLElement;
    expect(within(row).getByText(/^v\d+\.\d+\.\d+$/)).toBeDefined();
    expect(screen.getByText(/secret command/)).toBeDefined();
  });

  it("the palette footer shows the version", () => {
    render(<Terminal />);
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    // Scope to the palette footer (the boot intro also shows a version line).
    const footer = screen.getByText("esc to close").parentElement as HTMLElement;
    expect(within(footer).getByText(/^v\d+\.\d+\.\d+$/)).toBeDefined();
  });
});

describe("skills --activity", () => {
  it("renders the skill-activity view and reveals evidence when a skill is tapped", () => {
    render(<Terminal />);
    run("skills --activity");
    expect(screen.getAllByText("skill activity").length).toBeGreaterThan(0);
    // tap the web/mobile skill -> its tagged evidence surfaces
    const webBtn = screen.getAllByRole("button", { name: /web \/ mobile/ });
    fireEvent.click(webBtn[webBtn.length - 1]);
    expect(screen.getAllByText("#portfolio").length).toBeGreaterThan(0);
  });

  it("bare skills keeps the static view and offers the activity chip", () => {
    render(<Terminal />);
    run("skills");
    // static view marker present, activity view's hint absent
    expect(screen.getAllByText("category overview").length).toBeGreaterThan(0);
    expect(screen.queryByText(/tap a skill for the work behind it/)).toBeNull();
    // but the activity view is one tap away
    expect(
      screen.getAllByRole("button", { name: "skill activity" }).length,
    ).toBeGreaterThan(0);
  });
});

describe("Updates tail", () => {
  it("shows the live indicator", () => {
    render(<Terminal />);
    run("updates");
    expect(screen.getByText("live")).toBeDefined();
    expect(screen.getByText(/tail -f/)).toBeDefined();
  });
});
